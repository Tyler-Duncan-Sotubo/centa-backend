import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray, sql, desc } from 'drizzle-orm';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { performanceAssessments } from './schema/performance-assessments.schema';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import {
  departments,
  employees,
  jobRoles,
  performanceCompetencies,
  performanceCycles,
  performanceGoalUpdates,
  performanceReviewQuestions,
  performanceReviewTemplates,
  performanceTemplateQuestions,
  users,
} from 'src/drizzle/schema';
import { assessmentSectionComments } from './schema/performance-assessment-comments.schema';
import { format, eachMonthOfInterval } from 'date-fns';
import { assessmentResponses } from './schema/performance-assessment-responses.schema';
import { performanceFeedback } from '../feedback/schema/performance-feedback.schema';
import { ClockInOutService } from 'src/modules/time/clock-in-out/clock-in-out.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { GetDashboardAssessmentsDto } from './dto/get-dashboard-assessments.dto';
import { feedbackResponses } from '../feedback/schema/performance-feedback-responses.schema';
import { assessmentConclusions } from './schema/performance-assessment-conclusions.schema';
import { CacheService } from 'src/common/cache/cache.service';
import { objectives } from '../goals/schema/performance-objectives.schema';

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly clockInOutService: ClockInOutService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ---------------------
  // Cache helpers
  // ---------------------
  private tags(companyId: string) {
    return [`company:${companyId}:assessments`];
  }
  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // Optional if Redis sets available:
    // await this.cache.invalidateTags(this.tags(companyId));
  }
  private serializeFilters(filters?: GetDashboardAssessmentsDto) {
    const obj = {
      status: filters?.status ?? 'all',
      type: filters?.type ?? 'all',
      cycleId: filters?.cycleId ?? 'all',
      reviewerId: filters?.reviewerId ?? 'all',
      departmentId: filters?.departmentId ?? 'all',
      search: (filters?.search ?? '').trim().toLowerCase(),
    };
    return JSON.stringify(obj);
  }

  // ---------------------
  // Commands (writes)
  // ---------------------

  async createAssessment(dto: CreateAssessmentDto, user: User) {
    let reviewerId = user.id;
    let revieweeId = dto.revieweeId;

    if (dto.type === 'self') {
      if (user.role === 'super_admin' || user.role === 'admin') {
        if (!dto.revieweeId) {
          throw new BadRequestException(
            'revieweeId must be provided for self reviews by admins.',
          );
        }
      } else {
        const employee = await this.db.query.employees.findFirst({
          where: eq(employees.userId, user.id),
        });

        if (!employee) {
          throw new BadRequestException(
            'No employee record found for current user.',
          );
        }
        revieweeId = employee.id;
      }
      reviewerId = user.id;
    }

    const [assessment] = await this.db
      .insert(performanceAssessments)
      .values({
        companyId: user.companyId,
        cycleId: dto.cycleId,
        templateId: dto.templateId,
        reviewerId,
        revieweeId,
        type: dto.type,
        status: 'not_started',
        createdAt: new Date(),
      })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'assessment',
      entityId: assessment.id,
      userId: user.id,
      details: 'Assessment created',
      changes: {
        assessmentId: assessment.id,
        revieweeId: assessment.revieweeId,
        reviewerId: assessment.reviewerId,
        cycleId: assessment.cycleId,
      },
    });

    await this.invalidate(user.companyId);
    return assessment;
  }

  async startAssessment(assessmentId: string, userId: string) {
    const assessment = await this.getAssessmentById(assessmentId);
    if (assessment.reviewerId !== userId) {
      throw new ForbiddenException('Not authorized to start this assessment');
    }
    if (assessment.status !== 'not_started') {
      throw new BadRequestException(
        'Assessment is already in progress or submitted',
      );
    }

    await this.auditService.logAction({
      action: 'start',
      entity: 'assessment',
      entityId: assessment.id,
      userId,
      details: 'Assessment started',
      changes: {
        assessmentId: assessment.id,
        revieweeId: assessment.revieweeId,
        reviewerId: assessment.reviewerId,
        cycleId: assessment.cycleId,
      },
    });

    await this.db
      .update(performanceAssessments)
      .set({ status: 'in_progress' })
      .where(eq(performanceAssessments.id, assessmentId));

    await this.invalidate(assessment.companyId);
  }

  async saveSectionComments(
    assessmentId: string,
    userId: string,
    dto: SubmitAssessmentDto,
  ) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (assessment.reviewerId !== userId) {
      throw new ForbiddenException('Not authorized to edit this assessment');
    }
    if (assessment.status === 'submitted') {
      throw new BadRequestException('Assessment is already finalized');
    }

    const sections = [
      { key: 'goalsComment', section: 'goals' },
      { key: 'attendanceComment', section: 'attendance' },
      { key: 'feedbackComment', section: 'feedback' },
      { key: 'questionnaireComment', section: 'questionnaire' },
    ] as const;

    const now = new Date();

    for (const { key, section } of sections) {
      const comment = dto[key];
      if (comment && comment.trim() !== '') {
        await this.db
          .delete(assessmentSectionComments)
          .where(
            and(
              eq(assessmentSectionComments.assessmentId, assessmentId),
              eq(assessmentSectionComments.section, section),
            ),
          );

        await this.db.insert(assessmentSectionComments).values({
          assessmentId,
          section,
          comment,
          createdAt: now,
        });
      }
    }

    await this.auditService.logAction({
      action: 'save_section_comments',
      entity: 'assessment',
      entityId: assessment.id,
      userId,
      details: 'Section comments saved',
      changes: {
        assessmentId: assessment.id,
        revieweeId: assessment.revieweeId,
        reviewerId: assessment.reviewerId,
        cycleId: assessment.cycleId,
        comments: sections.reduce(
          (acc, { key, section }) => {
            acc[section] = dto[key] || '';
            return acc;
          },
          {} as Record<string, string>,
        ),
      },
    });

    await this.invalidate(assessment.companyId);
    return { success: true };
  }

  // ---------------------
  // Queries (reads) — cached & versioned
  // ---------------------

  async getAssessmentsForDashboard(
    companyId: string,
    filters?: GetDashboardAssessmentsDto,
  ) {
    const cacheKeyParts = [
      'assessments',
      'dashboard',
      this.serializeFilters(filters),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKeyParts, async () => {
      const whereClauses = [eq(performanceAssessments.companyId, companyId)];

      if (filters?.status && filters.status !== 'all') {
        whereClauses.push(
          eq(
            performanceAssessments.status,
            filters.status as 'not_started' | 'in_progress' | 'submitted',
          ),
        );
      }
      if (filters?.type && filters.type !== 'all') {
        whereClauses.push(
          eq(
            performanceAssessments.type,
            filters.type as 'self' | 'manager' | 'peer',
          ),
        );
      }
      if (filters?.cycleId && filters.cycleId !== 'all') {
        whereClauses.push(eq(performanceAssessments.cycleId, filters.cycleId));
      }
      if (filters?.reviewerId && filters.reviewerId !== 'all') {
        whereClauses.push(
          eq(performanceAssessments.reviewerId, filters.reviewerId),
        );
      }
      if (filters?.departmentId && filters.departmentId !== 'all') {
        whereClauses.push(eq(departments.id, filters.departmentId));
      }

      const assessments = await this.db
        .select({
          id: performanceAssessments.id,
          type: performanceAssessments.type,
          status: performanceAssessments.status,
          createdAt: performanceAssessments.createdAt,
          submittedAt: performanceAssessments.submittedAt,
          cycleId: performanceAssessments.cycleId,
          dueDate: performanceCycles.endDate,
          templateId: performanceAssessments.templateId,
          revieweeId: performanceAssessments.revieweeId,
          revieweeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          jobRoleName: jobRoles.title,
          score: assessmentConclusions.finalScore,
          reviewerId: performanceAssessments.reviewerId,
          reviewerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        })
        .from(performanceAssessments)
        .leftJoin(
          performanceCycles,
          eq(performanceCycles.id, performanceAssessments.cycleId),
        )
        .leftJoin(
          assessmentConclusions,
          eq(assessmentConclusions.assessmentId, performanceAssessments.id),
        )
        .leftJoin(
          employees,
          eq(employees.id, performanceAssessments.revieweeId),
        )
        .leftJoin(users, eq(users.id, performanceAssessments.reviewerId))
        .leftJoin(departments, eq(departments.id, employees.departmentId))
        .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
        .where(and(...whereClauses));

      // Optional fuzzy search (employee name)
      let filtered = assessments;
      if (filters?.search?.trim()) {
        const keyword = filters.search.toLowerCase();
        filtered = assessments.filter((a) =>
          a.revieweeName?.toLowerCase().includes(keyword),
        );
      }

      return filtered.map((a) => ({
        id: a.id,
        type: a.type,
        status: a.status,
        reviewer: a.reviewerName,
        employee: a.revieweeName,
        departmentName: a.departmentName,
        jobRoleName: a.jobRoleName,
        createdAt: a.createdAt,
        submittedAt: a.submittedAt,
        progress: this.calculateProgress(a.status ?? ''),
        dueDate: a.dueDate,
        score: a.score ?? null,
      }));
    });
  }

  async getAssessmentById(assessmentId: string) {
    // Get company scope first for versioned caching
    const [meta] = await this.db
      .select({ companyId: performanceAssessments.companyId })
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (!meta) {
      throw new NotFoundException('Assessment not found');
    }

    return this.cache.getOrSetVersioned(
      meta.companyId,
      ['assessments', 'one', assessmentId],
      async () => {
        const [assessment] = await this.db
          .select({
            id: performanceAssessments.id,
            type: performanceAssessments.type,
            status: performanceAssessments.status,
            createdAt: performanceAssessments.createdAt,
            submittedAt: performanceAssessments.submittedAt,
            cycleId: performanceAssessments.cycleId,
            dueDate: performanceCycles.endDate,
            templateId: performanceAssessments.templateId,
            companyId: performanceAssessments.companyId,
            revieweeId: performanceAssessments.revieweeId,
            revieweeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            departmentName: departments.name,
            reviewerId: performanceAssessments.reviewerId,
            reviewerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          })
          .from(performanceAssessments)
          .leftJoin(
            performanceCycles,
            eq(performanceCycles.id, performanceAssessments.cycleId),
          )
          .leftJoin(
            employees,
            eq(employees.id, performanceAssessments.revieweeId),
          )
          .leftJoin(users, eq(users.id, performanceAssessments.reviewerId))
          .leftJoin(departments, eq(departments.id, employees.departmentId))
          .where(eq(performanceAssessments.id, assessmentId));

        if (!assessment) {
          throw new NotFoundException('Assessment not found');
        }

        const [template] = await this.db
          .select()
          .from(performanceReviewTemplates)
          .where(eq(performanceReviewTemplates.id, assessment.templateId));

        const [cycle] = await this.db
          .select()
          .from(performanceCycles)
          .where(eq(performanceCycles.id, assessment.cycleId));

        if (!template || !cycle) {
          throw new NotFoundException('Template or cycle not found');
        }

        const result: any = { ...assessment, templateName: template.name };

        // Section Comments
        const sectionComments = await this.db
          .select({
            section: assessmentSectionComments.section,
            comment: assessmentSectionComments.comment,
          })
          .from(assessmentSectionComments)
          .where(eq(assessmentSectionComments.assessmentId, assessment.id));
        result.sectionComments = sectionComments;

        // Questionnaire
        if (template.includeQuestionnaire) {
          const questions = await this.db
            .select({
              questionId: performanceReviewQuestions.id,
              question: performanceReviewQuestions.question,
              type: performanceReviewQuestions.type,
              isGlobal: performanceReviewQuestions.isGlobal,
              response: assessmentResponses.response,
              order: performanceTemplateQuestions.order,
              isMandatory: performanceTemplateQuestions.isMandatory,
              competency: performanceCompetencies.name,
            })
            .from(performanceTemplateQuestions)
            .innerJoin(
              performanceReviewQuestions,
              eq(
                performanceTemplateQuestions.questionId,
                performanceReviewQuestions.id,
              ),
            )
            .leftJoin(
              assessmentResponses,
              and(
                eq(assessmentResponses.assessmentId, assessment.id),
                eq(
                  assessmentResponses.questionId,
                  performanceReviewQuestions.id,
                ),
              ),
            )
            .leftJoin(
              performanceCompetencies,
              eq(
                performanceCompetencies.id,
                performanceReviewQuestions.competencyId,
              ),
            )
            .where(eq(performanceTemplateQuestions.templateId, template.id))
            .orderBy(performanceTemplateQuestions.order);

          const groupedQuestions = questions.reduce(
            (acc, q) => {
              const key = q.competency || 'Uncategorized';
              if (!acc[key]) acc[key] = [];
              acc[key].push(q);
              return acc;
            },
            {} as Record<string, typeof questions>,
          );

          result.questions = groupedQuestions;
        }

        // Goals
        if (template.includeGoals) {
          const goals = await this.db
            .select({
              id: objectives.id,
              title: objectives.title,
              dueDate: objectives.dueDate,
              weight: objectives.weight,
              status: objectives.status,
              employee: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
              employeeId: employees.id,
              departmentName: departments.name,
              departmentId: departments.id,
            })
            .from(objectives)
            .innerJoin(employees, eq(employees.id, objectives.ownerEmployeeId))
            .leftJoin(departments, eq(departments.id, employees.departmentId))
            .where(and(eq(objectives.ownerEmployeeId, assessment.revieweeId)))
            .orderBy(desc(objectives.assignedAt));

          const latestProgress = await this.db
            .select({
              goalId: performanceGoalUpdates.objectiveId,
              progress: performanceGoalUpdates.progressPct,
            })
            .from(performanceGoalUpdates)
            .where(
              inArray(
                performanceGoalUpdates.objectiveId,
                goals.map((g) => g.id),
              ),
            )
            .orderBy(desc(objectives.assignedAt));

          const progressMap = new Map<string, number>();
          for (const update of latestProgress) {
            if (
              update.goalId !== null &&
              update.progress !== null &&
              !progressMap.has(update.goalId)
            ) {
              progressMap.set(update.goalId, update.progress);
            }
          }

          const enrichedGoals = goals.map((goal) => ({
            ...goal,
            progress: progressMap.get(goal.id) ?? 0,
          }));

          result.goals = enrichedGoals;
        }

        // Feedback
        if (template.includeFeedback) {
          const feedbacks = await this.db
            .select({
              id: performanceFeedback.id,
              type: performanceFeedback.type,
              createdAt: performanceFeedback.createdAt,
              isAnonymous: performanceFeedback.isAnonymous,
              isArchived: performanceFeedback.isArchived,
              employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
              senderFirstName: users.firstName,
              senderLastName: users.lastName,
              departmentName: departments.name,
              departmentId: departments.id,
            })
            .from(performanceFeedback)
            .where(eq(performanceFeedback.recipientId, assessment.revieweeId))
            .leftJoin(
              employees,
              eq(employees.id, performanceFeedback.recipientId),
            )
            .leftJoin(departments, eq(departments.id, employees.departmentId))
            .leftJoin(users, eq(users.id, performanceFeedback.senderId));

          const feedbackIds = feedbacks.map((f) => f.id);
          const responses = await this.getResponsesForFeedback(feedbackIds);

          result.feedback = feedbacks.map((f) => ({
            id: f.id,
            type: f.type,
            createdAt: f.createdAt,
            employeeName: f.employeeName,
            senderName: f.isAnonymous
              ? 'Anonymous'
              : `${f.senderFirstName ?? ''} ${f.senderLastName ?? ''}`.trim(),
            questionsCount: responses.filter((r) => r.feedbackId === f.id)
              .length,
            departmentName: f.departmentName,
            departmentId: f.departmentId,
          }));
        }

        // Attendance
        if (template.includeAttendance) {
          const attendance = await this.getAttendanceSummaryForCycle(
            assessment.revieweeId,
            assessment.companyId,
            {
              startDate: cycle.startDate,
              endDate: cycle.endDate,
            },
          );
          result.attendance = attendance;
        }

        return result;
      },
    );
  }

  // (left uncached: getAssessmentsForUser, getTeamAssessments, getReviewSummary)
  // They don't carry companyId in signature; caching would require extra lookups.

  async getAssessmentsForUser(userId: string) {
    return this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.revieweeId, userId));
  }

  async getTeamAssessments(managerId: string, cycleId: string) {
    const team = await this.db
      .select({
        id: users.id,
      })
      .from(users)
      .innerJoin(employees, eq(users.id, employees.userId))
      .where(eq(employees.managerId, managerId));

    const teamIds = team.map((u) => u.id);

    return this.db
      .select()
      .from(performanceAssessments)
      .where(
        and(
          eq(performanceAssessments.cycleId, cycleId),
          inArray(performanceAssessments.revieweeId, teamIds),
          eq(performanceAssessments.type, 'manager'),
        ),
      );
  }

  async getReviewSummary(revieweeId: string, cycleId: string) {
    return this.db
      .select()
      .from(performanceAssessments)
      .where(
        and(
          eq(performanceAssessments.cycleId, cycleId),
          eq(performanceAssessments.revieweeId, revieweeId),
        ),
      );
  }

  // ---------------------
  // Internals
  // ---------------------

  private async getAttendanceSummaryForCycle(
    userId: string,
    companyId: string,
    cycle: { startDate: string; endDate: string },
  ) {
    const months = eachMonthOfInterval({
      start: cycle.startDate,
      end: cycle.endDate,
    }).map((d) => format(d, 'yyyy-MM'));

    // Cache this computed summary as well
    return this.cache.getOrSetVersioned(
      companyId,
      [
        'assessments',
        'attendance-summary',
        userId,
        cycle.startDate,
        cycle.endDate,
      ],
      async () => {
        const attendancePromises = months.map((month) =>
          this.clockInOutService.getEmployeeAttendanceByMonth(
            userId,
            companyId,
            month,
          ),
        );

        const monthlyResults = await Promise.all(attendancePromises);

        const summary = {
          totalDays: 0,
          present: 0,
          absent: 0,
          late: 0,
        };

        for (const { summaryList } of monthlyResults) {
          for (const record of summaryList) {
            summary.totalDays++;
            if (record.status === 'present') summary.present++;
            if (record.status === 'absent') summary.absent++;
            if (record.status === 'late') summary.late++;
          }
        }

        return summary;
      },
    );
  }

  private calculateProgress(status: string): number {
    switch (status) {
      case 'not_started':
        return 0;
      case 'in_progress':
        return 50;
      case 'submitted':
        return 100;
      default:
        return 0;
    }
  }

  async getResponsesForFeedback(feedbackIds: string[]) {
    return await this.db
      .select({
        feedbackId: feedbackResponses.feedbackId,
        questionId: feedbackResponses.question,
      })
      .from(feedbackResponses)
      .where(inArray(feedbackResponses.feedbackId, feedbackIds));
  }
}
