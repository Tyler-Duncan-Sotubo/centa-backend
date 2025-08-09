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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    @InjectQueue('resumeScoringQueue') private readonly queue: Queue,
    private readonly awsService: AwsService,
    private readonly auditService: AuditService,
    private readonly resumeScoring: ResumeScoringService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(ApplicationsService.name);
  }

  // ---------- cache keys ----------
  private appDetailKey(appId: string) {
    return `apps:detail:${appId}`;
  }
  private kanbanKey(jobId: string) {
    return `apps:job:${jobId}:kanban`;
  }
  private appHistoryKey(appId: string) {
    return `apps:${appId}:history`;
  }
  private async burst(opts: { appId?: string; jobId?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.appId) {
      jobs.push(this.cache.del(this.appDetailKey(opts.appId)));
      jobs.push(this.cache.del(this.appHistoryKey(opts.appId)));
    }
    if (opts.jobId) jobs.push(this.cache.del(this.kanbanKey(opts.jobId)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:applications');
  }

  // ---------- commands ----------
  async submitApplication(dto: CreateApplicationDto, user: User) {
    const { jobId } = dto;
    this.logger.info({ jobId }, 'apps:submit:start');

    // 1. Get form config for the job
    const [form] = await this.db
      .select()
      .from(application_form_configs)
      .where(eq(application_form_configs.jobId, jobId))
      .execute();

    if (!form) {
      this.logger.warn({ jobId }, 'apps:submit:no-form');
      throw new NotFoundException('No application form found for this job');
    }

    // 2. Extract personal fields
    const fieldResponses = dto.fieldResponses ?? [];
    const extractField = (label: string) =>
      fieldResponses.find((f) => f.label.toLowerCase() === label.toLowerCase())
        ?.value;

    const email = extractField('Email Address');
    const fullName = extractField('Full Name');
    const phone = extractField('Phone Number');
    const skillsRaw = extractField('Skills');

    if (!email || !fullName) {
      this.logger.warn({ jobId }, 'apps:submit:missing-required');
      throw new BadRequestException('Full Name and Email Address are required');
    }

    // 3. Upload files (e.g. Resume, Cover Letter)
    dto.fieldResponses = await this.handleFileUploads(
      dto.fieldResponses ?? [],
      email,
    );

    const resumeField = dto.fieldResponses.find(
      (f) => f.label.toLowerCase() === 'resume/cv',
    );
    const resumeUrl = resumeField?.value as string | undefined;

    // 4. Create or fetch candidate
    let [candidate] = await this.db
      .select()
      .from(candidates)
      .where(eq(candidates.email, email))
      .execute();

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
          profile: { fieldResponses: dto.fieldResponses },
        })
        .returning()
        .execute();
      this.logger.debug(
        { candidateId: candidate.id },
        'apps:submit:candidate:created',
      );
    }

    // 5. Create skills if provided
    const skillsList =
      skillsRaw
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) || [];

    if (skillsList.length) {
      const insertedSkills = await this.ensureSkillsExist(skillsList);
      const existingLinks = await this.db
        .select({ skillId: candidate_skills.skillId })
        .from(candidate_skills)
        .where(eq(candidate_skills.candidateId, candidate.id))
        .execute();
      const existingSkillIds = new Set(existingLinks.map((s) => s.skillId));
      const newLinks = insertedSkills
        .filter((skill) => !existingSkillIds.has(skill.id))
        .map((skill) => ({ candidateId: candidate.id, skillId: skill.id }));
      if (newLinks.length > 0)
        await this.db.insert(candidate_skills).values(newLinks).execute();
    }

    // 6. Get first pipeline stage
    const [firstStage] = await this.db
      .select()
      .from(pipeline_stages)
      .where(eq(pipeline_stages.jobId, jobId))
      .orderBy(asc(pipeline_stages.order))
      .limit(1)
      .execute();

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
      .returning()
      .execute();

    // 8. Field responses
    if (dto.fieldResponses?.length) {
      await this.db
        .insert(application_field_responses)
        .values(
          dto.fieldResponses.map((f) => ({
            applicationId: application.id,
            label: f.label,
            value: f.value,
            required: true,
            createdAt: new Date(),
          })),
        )
        .execute();
    }

    // 9. Question responses
    const questionResponses = dto.questionResponses ?? [];
    if (questionResponses.length) {
      await this.db
        .insert(application_question_responses)
        .values(
          questionResponses.map((q) => ({
            applicationId: application.id,
            question: q.question,
            answer: q.answer,
            createdAt: new Date(),
          })),
        )
        .execute();
    }

    // 10. Pipeline stage instance
    if (firstStage) {
      await this.db
        .insert(pipeline_stage_instances)
        .values({
          applicationId: application.id,
          stageId: firstStage.id,
          enteredAt: new Date(),
        })
        .execute();
    }

    // 11. Application status history
    await this.db
      .insert(application_history)
      .values({
        applicationId: application.id,
        fromStatus: 'applied',
        toStatus: 'applied',
        changedAt: new Date(),
        notes: 'Application submitted',
      })
      .execute();

    // 12. Score resume (async)
    const [job] = await this.db
      .select({
        title: job_postings.title,
        responsibilities: job_postings.responsibilities,
        requirements: job_postings.requirements,
      })
      .from(job_postings)
      .where(eq(job_postings.id, jobId))
      .execute();

    if (job && resumeUrl) {
      await this.queue.add('score-resume', {
        resumeUrl,
        job,
        applicationId: application.id,
      });
    }

    // 13. Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'application',
      entityId: application.id,
      details: 'Application submitted',
      userId: user.id,
      changes: { jobId, candidateId: candidate.id },
    });

    await this.burst({ appId: application.id, jobId });
    this.logger.info({ applicationId: application.id }, 'apps:submit:done');
    return { success: true, applicationId: application.id };
  }

  // ---------- queries (cached) ----------
  async getApplicationDetails(applicationId: string) {
    const key = this.appDetailKey(applicationId);
    this.logger.debug({ key, applicationId }, 'apps:detail:cache:get');

    const payload = await this.cache.getOrSetCache(key, async () => {
      // 1. Fetch application
      const [application] = await this.db
        .select()
        .from(applications)
        .where(eq(applications.id, applicationId))
        .execute();
      if (!application) return null;

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
            .where(eq(application_field_responses.applicationId, applicationId))
            .execute(),
          this.db
            .select({
              question: application_question_responses.question,
              answer: application_question_responses.answer,
            })
            .from(application_question_responses)
            .where(
              eq(application_question_responses.applicationId, applicationId),
            )
            .execute(),
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
            .orderBy(desc(pipeline_history.movedAt))
            .execute(),
        ]);

      // 3. Fetch interview
      const interview = await this.db
        .select()
        .from(interviews)
        .where(eq(interviews.applicationId, applicationId))
        .then((res) => res[0]);

      let interviewers: {
        id: string;
        name: string;
        email: string;
        scorecard?: any;
      }[] = [];
      if (interview) {
        const rawInterviewers = await this.db
          .select({
            id: users.id,
            name: sql`concat(${users.firstName}, ' ', ${users.lastName})`,
            email: users.email,
            scorecardTemplateId: interviewInterviewers.scorecardTemplateId,
          })
          .from(interviewInterviewers)
          .innerJoin(users, eq(interviewInterviewers.interviewerId, users.id))
          .where(eq(interviewInterviewers.interviewId, interview.id))
          .execute();

        interviewers = rawInterviewers.map((row) => ({
          id: row.id,
          name: String(row.name),
          email: row.email,
        }));
        const templateIds = [
          ...new Set(
            rawInterviewers.map((i) => i.scorecardTemplateId).filter(Boolean),
          ),
        ] as string[];

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
              .where(inArray(scorecard_criteria.templateId, templateIds))
              .execute()
          : [];

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
          if (!grouped[c.templateId])
            grouped[c.templateId] = {
              name: c.templateName,
              description: c.templateDescription ?? '',
              criteria: [],
            };
          grouped[c.templateId].criteria.push({
            criterionId: c.criterionId,
            label: c.label,
            description: c.description,
            maxScore: c.maxScore,
            order: c.order,
          });
        }

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
        interview: interview ? { ...interview, interviewers } : null,
      };
    });

    if (!payload) {
      this.logger.warn({ applicationId }, 'apps:detail:not-found');
      throw new NotFoundException('Application not found');
    }

    return payload;
  }

  async listApplicationsByJobKanban(jobId: string) {
    const key = this.kanbanKey(jobId);
    this.logger.debug({ key, jobId }, 'apps:kanban:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const stages = await this.db
        .select()
        .from(pipeline_stages)
        .where(eq(pipeline_stages.jobId, jobId))
        .orderBy(asc(pipeline_stages.order))
        .execute();

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
            .innerJoin(candidates, eq(applications.candidateId, candidates.id))
            .where(
              and(
                eq(applications.jobId, jobId),
                eq(applications.currentStage, stage.id),
                not(eq(applications.status, 'rejected')),
              ),
            )
            .orderBy(applications.appliedAt)
            .execute();

          const applicationsWithSkills = await Promise.all(
            rawApps.map(async (app) => {
              const skillRows = await this.db
                .select({ name: skills.name })
                .from(candidate_skills)
                .innerJoin(skills, eq(candidate_skills.skillId, skills.id))
                .where(eq(candidate_skills.candidateId, app.candidateId))
                .limit(3)
                .execute();

              return { ...app, skills: skillRows.map((s) => s.name) };
            }),
          );

          return {
            stageId: stage.id,
            stageName: stage.name,
            applications: applicationsWithSkills,
          };
        }),
      );

      this.logger.debug(
        { jobId, stages: result.length },
        'apps:kanban:db:done',
      );
      return result;
    });
  }

  // ---------- state changes ----------
  async moveToStage(dto: MoveToStageDto, user: User) {
    const { applicationId, newStageId, feedback } = dto;
    this.logger.info(
      { applicationId, newStageId, userId: user.id },
      'apps:moveToStage:start',
    );

    await this.db
      .update(applications)
      .set({ currentStage: newStageId })
      .where(eq(applications.id, applicationId))
      .execute();

    await this.db
      .insert(pipeline_history)
      .values({
        applicationId,
        stageId: newStageId,
        movedAt: new Date(),
        movedBy: user.id,
        feedback,
      })
      .execute();
    await this.db
      .insert(pipeline_stage_instances)
      .values({ applicationId, stageId: newStageId, enteredAt: new Date() })
      .execute();

    await this.auditService.logAction({
      action: 'move_to_stage',
      entity: 'application',
      entityId: applicationId,
      userId: user.id,
      details: 'Moved to stage ' + newStageId,
      changes: { toStage: newStageId },
    });

    // find jobId for burst
    const [row] = await this.db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .execute();

    await this.burst({ appId: applicationId, jobId: row?.jobId });
    this.logger.info({ applicationId }, 'apps:moveToStage:done');
    return { success: true };
  }

  async changeStatus(dto: ChangeApplicationStatusDto, user: User) {
    const { applicationId, newStatus, notes } = dto;
    this.logger.info(
      { applicationId, newStatus, userId: user.id },
      'apps:changeStatus:start',
    );

    const [app] = await this.db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .execute();
    if (!app) {
      this.logger.warn({ applicationId }, 'apps:changeStatus:not-found');
      throw new NotFoundException('Application not found');
    }

    await this.db
      .update(applications)
      .set({ status: newStatus })
      .where(eq(applications.id, applicationId))
      .execute();

    await this.db
      .insert(application_history)
      .values({
        applicationId,
        fromStatus: app.status,
        toStatus: newStatus,
        changedBy: user.id,
        changedAt: new Date(),
        notes,
      })
      .execute();

    await this.auditService.logAction({
      action: 'change_status',
      entity: 'application',
      entityId: applicationId,
      userId: user.id,
      details: `Changed status from ${app.status} to ${newStatus}`,
      changes: { fromStatus: app.status, toStatus: newStatus },
    });

    const [row] = await this.db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .execute();
    await this.burst({ appId: applicationId, jobId: row?.jobId });
    this.logger.info({ applicationId }, 'apps:changeStatus:done');
    return { success: true };
  }

  // ---------- helpers ----------
  async ensureSkillsExist(skillNames: string[]) {
    if (!skillNames.length) return [] as Array<{ id: string; name: string }>;

    const normalized = skillNames.map((s) => s.trim());
    const existing = await this.db
      .select()
      .from(skills)
      .where(inArray(skills.name, normalized))
      .execute();

    const existingNames = new Set(existing.map((s) => s.name));
    const missing = normalized.filter((name) => !existingNames.has(name));

    let inserted: typeof existing = [];
    if (missing.length > 0) {
      inserted = await this.db
        .insert(skills)
        .values(missing.map((name) => ({ name })))
        .returning()
        .execute();
    }

    return [...existing, ...inserted];
  }

  async handleFileUploads(
    fieldResponses: FieldResponseDto[],
    email: string,
  ): Promise<FieldResponseDto[]> {
    const updatedResponses = await Promise.all(
      (fieldResponses ?? []).map(async (field) => {
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

          return { ...field, value: fileUrl };
        }
        return field;
      }),
    );

    return updatedResponses;
  }
}
