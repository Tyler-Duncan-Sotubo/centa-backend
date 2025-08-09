import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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
  performanceGoals,
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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly clockInOutService: ClockInOutService,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(AssessmentsService.name);
  }

  // ---------- cache keys ----------
  private oneKey(assessmentId: string) {
    return `pa:assessment:${assessmentId}:detail`;
  }
  private dashboardKey(
    companyId: string,
    filters?: GetDashboardAssessmentsDto,
  ) {
    const f = JSON.stringify(filters ?? {});
    return `pa:${companyId}:dashboard:${f}`;
  }
  private userListKey(userId: string) {
    return `pa:user:${userId}:list`;
  }
  private teamKey(managerId: string, cycleId: string) {
    return `pa:team:${managerId}:cycle:${cycleId}`;
  }
  private reviewSummaryKey(revieweeId: string, cycleId: string) {
    return `pa:summary:${revieweeId}:${cycleId}`;
  }
  private attendanceKey(
    userId: string,
    companyId: string,
    start: string,
    end: string,
  ) {
    return `pa:att:${userId}:${companyId}:${start}:${end}`;
  }

  private async burst(opts: {
    assessmentId?: string;
    companyId?: string;
    reviewerId?: string;
    revieweeId?: string;
    managerId?: string;
    cycleId?: string;
    attendance?: {
      userId: string;
      companyId: string;
      start: string;
      end: string;
    };
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.assessmentId)
      jobs.push(this.cache.del(this.oneKey(opts.assessmentId)));
    if (opts.reviewerId)
      jobs.push(this.cache.del(this.userListKey(opts.reviewerId)));
    if (opts.revieweeId)
      jobs.push(this.cache.del(this.userListKey(opts.revieweeId)));
    if (opts.managerId && opts.cycleId)
      jobs.push(this.cache.del(this.teamKey(opts.managerId, opts.cycleId)));
    if (opts.revieweeId && opts.cycleId)
      jobs.push(
        this.cache.del(this.reviewSummaryKey(opts.revieweeId, opts.cycleId)),
      );
    // We can’t know all dashboard filters that are cached; leave those warm (or add a cache service "match delete" if supported).
    if (opts.attendance) {
      const { userId, companyId, start, end } = opts.attendance;
      jobs.push(
        this.cache.del(this.attendanceKey(userId, companyId, start, end)),
      );
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:assessments');
  }

  // ---------- commands ----------
  async createAssessment(dto: CreateAssessmentDto, user: User) {
    this.logger.info(
      { userId: user.id, companyId: user.companyId, dto },
      'assessment:create:start',
    );

    let reviewerId = user.id;
    let revieweeId = dto.revieweeId;

    if (dto.type === 'self') {
      if (user.role === 'super_admin' || user.role === 'admin') {
        if (!dto.revieweeId) {
          this.logger.warn(
            { userId: user.id },
            'assessment:create:self:admin-missing-reviewee',
          );
          throw new BadRequestException(
            'revieweeId must be provided for self reviews by admins.',
          );
        }
      } else {
        const employee = await this.db.query.employees.findFirst({
          where: eq(employees.userId, user.id),
        });
        if (!employee) {
          this.logger.warn(
            { userId: user.id },
            'assessment:create:self:no-employee',
          );
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
      .returning()
      .execute();

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

    await this.burst({
      reviewerId,
      revieweeId,
      cycleId: dto.cycleId,
    });

    this.logger.info({ id: assessment.id }, 'assessment:create:done');
    return assessment;
  }

  async startAssessment(assessmentId: string, userId: string) {
    this.logger.info({ assessmentId, userId }, 'assessment:start:start');

    const assessment = await this.getAssessmentById(assessmentId);
    if (assessment.reviewerId !== userId) {
      this.logger.warn({ assessmentId, userId }, 'assessment:start:forbidden');
      throw new ForbiddenException('Not authorized to start this assessment');
    }
    if (assessment.status !== 'not_started') {
      this.logger.warn(
        { assessmentId, status: assessment.status },
        'assessment:start:invalid-state',
      );
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
      .where(eq(performanceAssessments.id, assessmentId))
      .execute();

    await this.burst({ assessmentId, reviewerId: userId });
    this.logger.info({ assessmentId }, 'assessment:start:done');
  }

  async saveSectionComments(
    assessmentId: string,
    userId: string,
    dto: SubmitAssessmentDto,
  ) {
    this.logger.info(
      { assessmentId, userId },
      'assessment:saveSectionComments:start',
    );

    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .execute();

    if (!assessment) {
      this.logger.warn(
        { assessmentId },
        'assessment:saveSectionComments:not-found',
      );
      throw new NotFoundException('Assessment not found');
    }
    if (assessment.reviewerId !== userId) {
      this.logger.warn(
        { assessmentId, userId },
        'assessment:saveSectionComments:forbidden',
      );
      throw new ForbiddenException('Not authorized to edit this assessment');
    }
    if (assessment.status === 'submitted') {
      this.logger.warn(
        { assessmentId },
        'assessment:saveSectionComments:already-submitted',
      );
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
          )
          .execute();

        await this.db
          .insert(assessmentSectionComments)
          .values({
            assessmentId,
            section,
            comment,
            createdAt: now,
          })
          .execute();
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

    await this.burst({ assessmentId });
    this.logger.info({ assessmentId }, 'assessment:saveSectionComments:done');
    return { success: true };
  }

  // ---------- queries (cached) ----------
  async getAssessmentsForDashboard(
    companyId: string,
    filters?: GetDashboardAssessmentsDto,
  ) {
    const key = this.dashboardKey(companyId, filters);
    this.logger.debug({ key, companyId, filters }, 'dashboard:get:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
        .where(and(...whereClauses))
        .execute();

      let filtered = assessments;
      if (filters?.search?.trim()) {
        const keyword = filters.search.toLowerCase();
        filtered = assessments.filter((a) =>
          a.revieweeName?.toLowerCase().includes(keyword),
        );
      }

      const out = filtered.map((a) => ({
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

      this.logger.debug(
        { companyId, count: out.length },
        'dashboard:get:db:done',
      );
      return out;
    });
  }

  async getAssessmentById(assessmentId: string) {
    const key = this.oneKey(assessmentId);
    this.logger.debug({ key, assessmentId }, 'assessment:get:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
        .where(eq(performanceAssessments.id, assessmentId))
        .execute();

      if (!assessment) {
        this.logger.warn({ assessmentId }, 'assessment:get:not-found');
        throw new NotFoundException('Assessment not found');
      }

      const [template] = await this.db
        .select()
        .from(performanceReviewTemplates)
        .where(eq(performanceReviewTemplates.id, assessment.templateId))
        .execute();

      const [cycle] = await this.db
        .select()
        .from(performanceCycles)
        .where(eq(performanceCycles.id, assessment.cycleId))
        .execute();

      if (!template || !cycle) {
        this.logger.warn(
          { assessmentId },
          'assessment:get:template-or-cycle:not-found',
        );
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
        .where(eq(assessmentSectionComments.assessmentId, assessment.id))
        .execute();
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
              eq(assessmentResponses.questionId, performanceReviewQuestions.id),
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
          .orderBy(performanceTemplateQuestions.order)
          .execute();

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
            id: performanceGoals.id,
            title: performanceGoals.title,
            dueDate: performanceGoals.dueDate,
            weight: performanceGoals.weight,
            status: performanceGoals.status,
            employee: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
            employeeId: employees.id,
            departmentName: departments.name,
            departmentId: departments.id,
          })
          .from(performanceGoals)
          .innerJoin(employees, eq(employees.id, performanceGoals.employeeId))
          .leftJoin(departments, eq(departments.id, employees.departmentId))
          .where(and(eq(performanceGoals.employeeId, assessment.revieweeId)))
          .orderBy(desc(performanceGoals.assignedAt))
          .execute();

        const latestProgress = await this.db
          .select({
            goalId: performanceGoalUpdates.goalId,
            progress: performanceGoalUpdates.progress,
          })
          .from(performanceGoalUpdates)
          .where(
            inArray(
              performanceGoalUpdates.goalId,
              goals.map((g) => g.id),
            ),
          )
          .orderBy(desc(performanceGoalUpdates.createdAt))
          .execute();

        const progressMap = new Map<string, number>();
        for (const update of latestProgress) {
          if (!progressMap.has(update.goalId)) {
            progressMap.set(update.goalId, update.progress);
          }
        }

        result.goals = goals.map((g) => ({
          ...g,
          progress: progressMap.get(g.id) ?? 0,
        }));
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
          .leftJoin(users, eq(users.id, performanceFeedback.senderId))
          .execute();

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
          questionsCount: responses.filter((r) => r.feedbackId === f.id).length,
          departmentName: f.departmentName,
          departmentId: f.departmentId,
        }));
      }

      // Attendance
      if (template.includeAttendance) {
        const att = await this.getAttendanceSummaryForCycle(
          assessment.revieweeId,
          assessment.companyId,
          {
            startDate: cycle.startDate,
            endDate: cycle.endDate,
          },
        );
        result.attendance = att;
      }

      this.logger.debug({ assessmentId }, 'assessment:get:db:done');
      return result;
    });
  }

  async getAssessmentsForUser(userId: string) {
    const key = this.userListKey(userId);
    this.logger.debug({ key, userId }, 'assessment:user:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(performanceAssessments)
        .where(eq(performanceAssessments.revieweeId, userId))
        .execute();
      this.logger.debug(
        { userId, count: rows.length },
        'assessment:user:list:db:done',
      );
      return rows;
    });
  }

  async getTeamAssessments(managerId: string, cycleId: string) {
    const key = this.teamKey(managerId, cycleId);
    this.logger.debug(
      { key, managerId, cycleId },
      'assessment:team:list:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const team = await this.db
        .select({ id: users.id })
        .from(users)
        .innerJoin(employees, eq(users.id, employees.userId))
        .where(eq(employees.managerId, managerId))
        .execute();

      const teamIds = team.map((u) => u.id);

      const rows = await this.db
        .select()
        .from(performanceAssessments)
        .where(
          and(
            eq(performanceAssessments.cycleId, cycleId),
            inArray(performanceAssessments.revieweeId, teamIds),
            eq(performanceAssessments.type, 'manager'),
          ),
        )
        .execute();

      this.logger.debug(
        { managerId, count: rows.length },
        'assessment:team:list:db:done',
      );
      return rows;
    });
  }

  async getReviewSummary(revieweeId: string, cycleId: string) {
    const key = this.reviewSummaryKey(revieweeId, cycleId);
    this.logger.debug(
      { key, revieweeId, cycleId },
      'assessment:summary:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const reviews = await this.db
        .select()
        .from(performanceAssessments)
        .where(
          and(
            eq(performanceAssessments.cycleId, cycleId),
            eq(performanceAssessments.revieweeId, revieweeId),
          ),
        )
        .execute();

      this.logger.debug(
        { revieweeId, count: reviews.length },
        'assessment:summary:db:done',
      );
      return reviews;
    });
  }

  private async getAttendanceSummaryForCycle(
    userId: string,
    companyId: string,
    cycle: { startDate: string; endDate: string },
  ) {
    const key = this.attendanceKey(
      userId,
      companyId,
      cycle.startDate,
      cycle.endDate,
    );
    this.logger.debug({ key, userId, companyId }, 'assessment:att:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const months = eachMonthOfInterval({
        start: cycle.startDate,
        end: cycle.endDate,
      }).map((d) => format(d, 'yyyy-MM'));

      const attendancePromises = months.map((month) =>
        this.clockInOutService.getEmployeeAttendanceByMonth(
          userId,
          companyId,
          month,
        ),
      );

      const monthlyResults = await Promise.all(attendancePromises);
      this.logger.debug(
        { userId, months: months.length },
        'assessment:att:db:done',
      );

      const summary = { totalDays: 0, present: 0, absent: 0, late: 0 };

      for (const { summaryList } of monthlyResults) {
        for (const record of summaryList) {
          summary.totalDays++;
          if (record.status === 'present') summary.present++;
          if (record.status === 'absent') summary.absent++;
          if (record.status === 'late') summary.late++;
        }
      }

      return summary;
    });
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
    this.logger.debug(
      { count: feedbackIds.length },
      'assessment:feedback-responses:get:start',
    );
    const rows = await this.db
      .select({
        feedbackId: feedbackResponses.feedbackId,
        questionId: feedbackResponses.question,
      })
      .from(feedbackResponses)
      .where(inArray(feedbackResponses.feedbackId, feedbackIds))
      .execute();
    this.logger.debug(
      { count: rows.length },
      'assessment:feedback-responses:get:done',
    );
    return rows;
  }
}
