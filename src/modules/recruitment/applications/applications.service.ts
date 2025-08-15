import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateApplicationDto,
  FieldResponseDto,
} from './dto/create-application.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, asc, desc, eq, inArray, not, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import {
  application_field_responses,
  application_form_configs,
  application_history,
  application_question_responses,
  applications,
  candidate_skills,
  candidates,
  interviewInterviewers,
  interviews,
  job_postings,
  pipeline_history,
  pipeline_stage_instances,
  pipeline_stages,
  scorecard_criteria,
  scorecard_templates,
  skills,
} from '../schema';
import { AwsService } from 'src/common/aws/aws.service';
import { MoveToStageDto } from './dto/move-to-stage.dto';
import { ChangeApplicationStatusDto } from './dto/chnage-app-status.dto';
import { User } from 'src/common/types/user.type';
import { ResumeScoringService } from './resume-scoring.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { users } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    @InjectQueue('resumeScoringQueue') private readonly queue: Queue,
    private readonly awsService: AwsService,
    private readonly auditService: AuditService,
    private readonly resumeScoring: ResumeScoringService,
    private readonly cache: CacheService,
  ) {}

  private tags(scope: string) {
    // scope is companyId or "global"
    return [
      `company:${scope}:applications`,
      `company:${scope}:applications:details`,
      `company:${scope}:applications:kanban`,
    ];
  }

  async submitApplication(dto: CreateApplicationDto) {
    const { jobId, fieldResponses, questionResponses = [] } = dto;

    // 1. Get form config for the job
    const [form] = await this.db
      .select()
      .from(application_form_configs)
      .where(eq(application_form_configs.jobId, jobId));

    if (!form) {
      throw new NotFoundException('No application form found for this job');
    }

    // 2. Extract personal fields
    const extractField = (label: string) =>
      fieldResponses.find((f) => f.label.toLowerCase() === label.toLowerCase())
        ?.value;

    const email = extractField('Email Address');
    const fullName = extractField('Full Name');
    const phone = extractField('Phone Number');
    const skillsRaw = extractField('Skills');

    if (!email || !fullName) {
      throw new BadRequestException('Full Name and Email Address are required');
    }

    // 3. Upload files (e.g. Resume, Cover Letter)
    dto.fieldResponses = await this.handleFileUploads(
      dto.fieldResponses,
      email,
    );

    const resumeField = dto.fieldResponses.find(
      (f) => f.label.toLowerCase() === 'resume/cv',
    );

    const resumeUrl = resumeField?.value;

    // 4. Create or fetch candidate
    let [candidate] = await this.db
      .select()
      .from(candidates)
      .where(eq(candidates.email, email));

    if (!candidate) {
      [candidate] = await this.db
        .insert(candidates)
        .values({
          fullName,
          email,
          phone,
          source: dto.candidateSource || 'career_page',
          resumeUrl,
          createdAt: new Date(),
          profile: {
            fieldResponses: dto.fieldResponses,
          },
        })
        .returning();
    }

    // 5. Create skills if provided
    const skills =
      skillsRaw
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) || [];

    if (skills.length) {
      const insertedSkills = await this.ensureSkillsExist(skills);

      // ✅ Get already-assigned skill IDs for the candidate
      const existingLinks = await this.db
        .select({ skillId: candidate_skills.skillId })
        .from(candidate_skills)
        .where(eq(candidate_skills.candidateId, candidate.id));

      const existingSkillIds = new Set(existingLinks.map((s) => s.skillId));

      // ✅ Filter out already-assigned skills
      const newLinks = insertedSkills
        .filter((skill) => !existingSkillIds.has(skill.id))
        .map((skill) => ({
          candidateId: candidate.id,
          skillId: skill.id,
        }));

      if (newLinks.length > 0) {
        await this.db.insert(candidate_skills).values(newLinks);
      }
    }

    // 6. Get first pipeline stage
    const [firstStage] = await this.db
      .select()
      .from(pipeline_stages)
      .where(eq(pipeline_stages.jobId, jobId))
      .orderBy(asc(pipeline_stages.order))
      .limit(1);

    // 7. Create application
    const [application] = await this.db
      .insert(applications)
      .values({
        candidateId: candidate.id,
        jobId,
        source: dto.applicationSource || 'career_page',
        currentStage: firstStage?.id,
        appliedAt: new Date(),
      })
      .returning();

    // 8. Field responses
    if (dto.fieldResponses?.length) {
      await this.db.insert(application_field_responses).values(
        dto.fieldResponses.map((f) => ({
          applicationId: application.id,
          label: f.label,
          value: f.value,
          required: true,
          createdAt: new Date(),
        })),
      );
    }

    // 9. Question responses
    if (questionResponses?.length) {
      await this.db.insert(application_question_responses).values(
        questionResponses.map((q) => ({
          applicationId: application.id,
          question: q.question,
          answer: q.answer,
          createdAt: new Date(),
        })),
      );
    }

    // 10. Pipeline stage instance
    if (firstStage) {
      await this.db.insert(pipeline_stage_instances).values({
        applicationId: application.id,
        stageId: firstStage.id,
        enteredAt: new Date(),
      });
    }

    // 11. Application status history
    await this.db.insert(application_history).values({
      applicationId: application.id,
      fromStatus: 'applied',
      toStatus: 'applied',
      changedAt: new Date(),
      notes: 'Application submitted',
    });

    // Job form (+ companyId for cache bump + scoring payload)
    const [job] = await this.db
      .select({
        title: job_postings.title,
        responsibilities: job_postings.responsibilities,
        requirements: job_postings.requirements,
        companyId: job_postings.companyId,
      })
      .from(job_postings)
      .where(eq(job_postings.id, jobId));

    if (job && resumeUrl) {
      await this.queue.add('score-resume', {
        resumeUrl,
        job,
        applicationId: application.id,
      });
    }

    // Invalidate caches: company and global (kanban & details consumers)
    if (job?.companyId) {
      await this.cache.bumpCompanyVersion(job.companyId);
    }
    await this.cache.bumpCompanyVersion('global');

    return { success: true, applicationId: application.id };
  }

  // READ (cached, global scope)
  async getApplicationDetails(applicationId: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['applications', 'details', applicationId],
      async () => {
        // 1. Fetch application
        const [application] = await this.db
          .select()
          .from(applications)
          .where(eq(applications.id, applicationId));

        if (!application) {
          throw new NotFoundException('Application not found');
        }

        // 2. Parallel fetch of related data
        const [candidate, fieldResponses, questionResponses, stageHistory] =
          await Promise.all([
            this.db
              .select()
              .from(candidates)
              .where(eq(candidates.id, application.candidateId))
              .then((res) => res[0]),

            this.db
              .select({
                label: application_field_responses.label,
                value: application_field_responses.value,
              })
              .from(application_field_responses)
              .where(
                eq(application_field_responses.applicationId, applicationId),
              ),

            this.db
              .select({
                question: application_question_responses.question,
                answer: application_question_responses.answer,
              })
              .from(application_question_responses)
              .where(
                eq(application_question_responses.applicationId, applicationId),
              ),

            this.db
              .select({
                name: pipeline_stages.name,
                movedAt: pipeline_history.movedAt,
                movedBy: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
              })
              .from(pipeline_history)
              .innerJoin(
                pipeline_stages,
                eq(pipeline_history.stageId, pipeline_stages.id),
              )
              .innerJoin(users, eq(pipeline_history.movedBy, users.id))
              .where(eq(pipeline_history.applicationId, applicationId))
              .orderBy(desc(pipeline_history.movedAt)),
          ]);

        // 3. Fetch interview
        const interview = await this.db
          .select()
          .from(interviews)
          .where(eq(interviews.applicationId, applicationId))
          .then((res) => res[0]);

        let interviewers: { id: string; name: string; email: string }[] = [];

        if (interview) {
          // 4. Fetch interviewers with their scorecardTemplateIds
          const rawInterviewers = await this.db
            .select({
              id: users.id,
              name: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
              email: users.email,
              scorecardTemplateId: interviewInterviewers.scorecardTemplateId,
            })
            .from(interviewInterviewers)
            .innerJoin(users, eq(interviewInterviewers.interviewerId, users.id))
            .where(eq(interviewInterviewers.interviewId, interview.id));

          interviewers = rawInterviewers.map((row) => ({
            id: row.id,
            name: String(row.name),
            email: row.email,
          }));

          const templateIds = [
            ...new Set(
              rawInterviewers.map((i) => i.scorecardTemplateId).filter(Boolean),
            ),
          ];

          // 5. Fetch criteria for all unique templates
          const criteria = templateIds.length
            ? await this.db
                .select({
                  criterionId: scorecard_criteria.id,
                  label: scorecard_criteria.label,
                  description: scorecard_criteria.description,
                  maxScore: scorecard_criteria.maxScore,
                  order: scorecard_criteria.order,
                  templateId: scorecard_criteria.templateId,
                  templateName: scorecard_templates.name,
                  templateDescription: scorecard_templates.description,
                })
                .from(scorecard_criteria)
                .innerJoin(
                  scorecard_templates,
                  eq(scorecard_criteria.templateId, scorecard_templates.id),
                )
                .where(
                  inArray(
                    scorecard_criteria.templateId,
                    templateIds.filter((id): id is string => !!id),
                  ),
                )
            : [];

          // 6. Group criteria by templateId
          const grouped: Record<
            string,
            {
              name: string;
              description: string;
              criteria: {
                criterionId: string;
                label: string;
                description: string | null;
                maxScore: number;
                order: number;
              }[];
            }
          > = {};

          for (const c of criteria) {
            if (!grouped[c.templateId]) {
              grouped[c.templateId] = {
                name: c.templateName,
                description: c.templateDescription ?? '',
                criteria: [],
              };
            }
            grouped[c.templateId].criteria.push({
              criterionId: c.criterionId,
              label: c.label,
              description: c.description,
              maxScore: c.maxScore,
              order: c.order,
            });
          }

          // 7. Attach scorecard to each interviewer
          interviewers = rawInterviewers.map((row) => {
            const scorecard =
              row.scorecardTemplateId && grouped[row.scorecardTemplateId]
                ? {
                    templateId: row.scorecardTemplateId,
                    name: grouped[row.scorecardTemplateId].name,
                    description: grouped[row.scorecardTemplateId].description,
                    criteria: grouped[row.scorecardTemplateId].criteria,
                  }
                : null;

            return {
              id: row.id,
              name: String(row.name),
              email: row.email,
              scorecard,
            };
          });
        }

        return {
          application,
          candidate,
          fieldResponses,
          questionResponses,
          stageHistory,
          interview: interview
            ? {
                ...interview,
                interviewers,
              }
            : null,
        };
      },
      { tags: this.tags('global') },
    );
  }

  // READ (cached, global scope)
  async listApplicationsByJobKanban(jobId: string) {
    return this.cache.getOrSetVersioned(
      'global',
      ['applications', 'kanban', jobId],
      async () => {
        // 1. Get all pipeline stages
        const stages = await this.db
          .select()
          .from(pipeline_stages)
          .where(eq(pipeline_stages.jobId, jobId))
          .orderBy(asc(pipeline_stages.order));

        // 2. Map each stage to its applications + candidate summary
        const result = await Promise.all(
          stages.map(async (stage) => {
            const rawApps = await this.db
              .select({
                applicationId: applications.id,
                candidateId: candidates.id,
                fullName: candidates.fullName,
                email: candidates.email,
                appliedAt: applications.appliedAt,
                status: applications.status,
                appSource: applications.source,
                resumeScore: applications.resumeScore,
              })
              .from(applications)
              .innerJoin(
                candidates,
                eq(applications.candidateId, candidates.id),
              )
              .where(
                and(
                  eq(applications.jobId, jobId),
                  eq(applications.currentStage, stage.id),
                  not(eq(applications.status, 'rejected')),
                ),
              )
              .orderBy(applications.appliedAt);

            // 3. Attach top 2–3 skills for each candidate
            const applicationsWithSkills = await Promise.all(
              rawApps.map(async (app) => {
                const skillRows = await this.db
                  .select({
                    name: skills.name,
                  })
                  .from(candidate_skills)
                  .innerJoin(skills, eq(candidate_skills.skillId, skills.id))
                  .where(eq(candidate_skills.candidateId, app.candidateId))
                  .limit(3);

                return {
                  ...app,
                  skills: skillRows.map((s) => s.name),
                };
              }),
            );

            return {
              stageId: stage.id,
              stageName: stage.name,
              applications: applicationsWithSkills,
            };
          }),
        );

        return result;
      },
      { tags: this.tags('global') },
    );
  }

  async moveToStage(dto: MoveToStageDto, user: User) {
    const { applicationId, newStageId, feedback } = dto;

    // Get companyId via job to invalidate cache precisely
    const [row] = await this.db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.id, applicationId));
    let companyIdForBump: string | undefined;
    if (row?.jobId) {
      const [jobRow] = await this.db
        .select({ companyId: job_postings.companyId })
        .from(job_postings)
        .where(eq(job_postings.id, row.jobId));
      companyIdForBump = jobRow?.companyId;
    }

    // Update application currentStage
    await this.db
      .update(applications)
      .set({ currentStage: newStageId })
      .where(eq(applications.id, applicationId));

    // Insert pipeline history
    await this.db.insert(pipeline_history).values({
      applicationId,
      stageId: newStageId,
      movedAt: new Date(),
      movedBy: user.id,
      feedback,
    });

    // Also update pipeline_stage_instances
    await this.db.insert(pipeline_stage_instances).values({
      applicationId,
      stageId: newStageId,
      enteredAt: new Date(),
    });

    // Audit log
    await this.auditService.logAction({
      action: 'move_to_stage',
      entity: 'application',
      entityId: applicationId,
      userId: user.id,
      details: 'Moved to stage ' + newStageId,
      changes: {
        toStage: newStageId,
      },
    });

    // Invalidate caches: company (if known) + global
    if (companyIdForBump) {
      await this.cache.bumpCompanyVersion(companyIdForBump);
    }
    await this.cache.bumpCompanyVersion('global');

    return { success: true };
  }

  async changeStatus(dto: ChangeApplicationStatusDto, user: User) {
    const { applicationId, newStatus, notes } = dto;
    const [app] = await this.db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId));

    if (!app) throw new NotFoundException('Application not found');

    await this.db
      .update(applications)
      .set({ status: newStatus })
      .where(eq(applications.id, applicationId));

    await this.db.insert(application_history).values({
      applicationId,
      fromStatus: app.status,
      toStatus: newStatus,
      changedBy: user.id,
      changedAt: new Date(),
      notes,
    });

    // Audit log
    await this.auditService.logAction({
      action: 'change_status',
      entity: 'application',
      entityId: applicationId,
      userId: user.id,
      details: `Changed status from ${app.status} to ${newStatus}`,
      changes: {
        fromStatus: app.status,
        toStatus: newStatus,
      },
    });

    // Invalidate caches: company (via job) + global
    const [jobRow] = await this.db
      .select({ companyId: job_postings.companyId })
      .from(job_postings)
      .where(eq(job_postings.id, app.jobId));

    if (jobRow?.companyId) {
      await this.cache.bumpCompanyVersion(jobRow.companyId);
    }
    await this.cache.bumpCompanyVersion('global');

    return { success: true };
  }

  async ensureSkillsExist(skillNames: string[]) {
    if (!skillNames.length) return [];

    // 1. Normalize skill names (e.g. trim, lower case)
    const normalized = skillNames.map((s) => s.trim());

    // 2. Fetch existing skills
    const existing = await this.db
      .select()
      .from(skills)
      .where(inArray(skills.name, normalized));

    const existingNames = new Set(existing.map((s) => s.name));
    const missing = normalized.filter((name) => !existingNames.has(name));

    // 3. Insert missing skills
    let inserted: typeof existing = [];
    if (missing.length > 0) {
      inserted = await this.db
        .insert(skills)
        .values(missing.map((name) => ({ name })))
        .returning();
      // Optional: you might bump 'global' if you cache skills lists elsewhere
    }

    // 4. Return all
    return [...existing, ...inserted];
  }

  async handleFileUploads(
    fieldResponses: FieldResponseDto[],
    email: string,
  ): Promise<FieldResponseDto[]> {
    const updatedResponses = await Promise.all(
      fieldResponses.map(async (field) => {
        if (field.fieldType === 'file' && field.value?.startsWith('data:')) {
          const [meta, base64Data] = field.value.split(',');
          const isPdf = meta.includes('application/pdf');

          const buffer = Buffer.from(base64Data, 'base64');
          const extension = isPdf
            ? 'pdf'
            : meta.includes('png')
              ? 'png'
              : 'jpg';
          const fileName = `${field.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.${extension}`;

          let fileUrl: string;
          if (isPdf) {
            fileUrl = await this.awsService.uploadPdfToS3(
              email,
              fileName,
              buffer,
            );
          } else {
            fileUrl = await this.awsService.uploadImageToS3(
              email,
              fileName,
              buffer,
            );
          }

          return {
            ...field,
            value: fileUrl,
          };
        }

        return field;
      }),
    );

    return updatedResponses;
  }
}
