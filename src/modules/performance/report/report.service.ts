import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql, isNotNull, gte, inArray, desc } from 'drizzle-orm';

import {
  departments,
  employees,
  jobRoles,
  performanceCycles,
  performanceGoals,
  users,
} from 'src/drizzle/schema';

import { User } from 'src/common/types/user.type';

import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';

import { performanceFeedback } from '../feedback/schema/performance-feedback.schema';
import { feedbackResponses } from '../feedback/schema/performance-feedback-responses.schema';
import { feedbackQuestions } from '../feedback/schema/performance-feedback-questions.schema';

import { performanceAssessments } from '../assessments/schema/performance-assessments.schema';
import { assessmentConclusions } from '../assessments/schema/performance-assessment-conclusions.schema';

@Injectable()
export class ReportService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  /**
   * Filters for reports & dashboards
   * (Appraisal cycles removed – performance cycles are the single source now)
   */
  async reportFilters(companyId: string) {
    const cycles = await this.db
      .select({ id: performanceCycles.id, name: performanceCycles.name })
      .from(performanceCycles)
      .where(eq(performanceCycles.companyId, companyId))
      .orderBy(desc(performanceCycles.startDate))
      .execute();

    const employeesList = await this.db
      .select({
        id: employees.id,
        name: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(employees)
      .where(eq(employees.companyId, companyId))
      .execute();

    const departmentsList = await this.db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.companyId, companyId))
      .orderBy(departments.name)
      .execute();

    return { cycles, employeesList, departmentsList };
  }

  /**
   * Goals report (Performance cycle)
   */
  async getGoalReport(user: User, filters?: GetGoalReportDto) {
    const { cycleId, employeeId, departmentId, status, minimumWeight } =
      filters || {};

    let targetCycleId = cycleId;

    // If no cycleId provided, find the active performance cycle
    if (!targetCycleId) {
      const [activeCycle] = await this.db
        .select({
          id: performanceCycles.id,
          name: performanceCycles.name,
          startDate: performanceCycles.startDate,
          endDate: performanceCycles.endDate,
        })
        .from(performanceCycles)
        .where(
          and(
            eq(performanceCycles.companyId, user.companyId),
            eq(performanceCycles.status, 'active'),
          ),
        )
        .orderBy(desc(performanceCycles.startDate))
        .limit(1)
        .execute();

      if (!activeCycle) return [];
      targetCycleId = activeCycle.id;
    }

    return this.db
      .select({
        goalId: performanceGoals.id,
        employeeId: employees.id,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        jobRoleName: jobRoles.title,
        departmentName: departments.name,
        title: performanceGoals.title,
        description: performanceGoals.description,
        type: performanceGoals.type,
        status: performanceGoals.status,
        weight: performanceGoals.weight,
        startDate: performanceGoals.startDate,
        dueDate: performanceGoals.dueDate,
      })
      .from(performanceGoals)
      .innerJoin(employees, eq(performanceGoals.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(jobRoles, eq(employees.jobRoleId, jobRoles.id))
      .where(
        and(
          eq(performanceGoals.companyId, user.companyId),
          eq(performanceGoals.cycleId, targetCycleId),
          eq(performanceGoals.isArchived, false),
          employeeId ? eq(performanceGoals.employeeId, employeeId) : undefined,
          departmentId ? eq(employees.departmentId, departmentId) : undefined,
          status ? eq(performanceGoals.status, status) : undefined,
          minimumWeight !== undefined
            ? gte(performanceGoals.weight, minimumWeight)
            : undefined,
        ),
      )
      .execute();
  }

  /**
   * Feedback report (Peer / Manager / Self)
   */
  async getFeedbackReport(user: User, filters: GetFeedbackReportDto) {
    const { type, employeeId } = filters;

    // Step 1: Fetch feedback entries
    const feedbackEntries = await this.db
      .select({
        feedbackId: performanceFeedback.id,
        recipientId: performanceFeedback.recipientId,
        isAnonymous: performanceFeedback.isAnonymous,
        submittedAt: performanceFeedback.submittedAt,
        senderId: performanceFeedback.senderId,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        senderName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(performanceFeedback)
      .leftJoin(employees, eq(performanceFeedback.recipientId, employees.id))
      .leftJoin(users, eq(performanceFeedback.senderId, users.id))
      .where(
        and(
          eq(performanceFeedback.companyId, user.companyId),
          eq(performanceFeedback.type, type),
          eq(performanceFeedback.isArchived, false),
          employeeId
            ? eq(performanceFeedback.recipientId, employeeId)
            : isNotNull(performanceFeedback.recipientId),
        ),
      )
      .execute();

    if (!feedbackEntries.length) return [];

    const feedbackIds = feedbackEntries.map((f) => f.feedbackId);

    // Step 2: Fetch associated responses WITH questions
    const responses = await this.db
      .select({
        feedbackId: feedbackResponses.feedbackId,
        questionText: feedbackQuestions.question,
        answer: feedbackResponses.answer,
        order: feedbackResponses.order,
      })
      .from(feedbackResponses)
      .innerJoin(
        feedbackQuestions,
        eq(feedbackQuestions.id, feedbackResponses.question),
      )
      .where(inArray(feedbackResponses.feedbackId, feedbackIds))
      .orderBy(feedbackResponses.feedbackId, feedbackResponses.order)
      .execute();

    // Step 3: Group responses
    const groupedResponses: Record<
      string,
      { questionText: string; answer: string; order: number }[]
    > = {};

    for (const r of responses) {
      if (!groupedResponses[r.feedbackId]) groupedResponses[r.feedbackId] = [];
      groupedResponses[r.feedbackId].push({
        questionText: r.questionText,
        answer: r.answer,
        order: r.order ?? 0,
      });
    }

    // Step 4: Merge into report
    return feedbackEntries.map((entry) => ({
      ...entry,
      senderName: entry.isAnonymous ? undefined : entry.senderName,
      responses: groupedResponses[entry.feedbackId] || [],
    }));
  }

  /**
   * Assessment report summary (Performance cycle)
   */
  async getAssessmentReportSummary(
    user: User,
    filters?: GetAssessmentReportDto,
  ) {
    const { cycleId, employeeId, reviewerId, departmentId, status } =
      filters || {};

    let targetCycleId = cycleId;

    // If no cycleId provided, find active performance cycle
    if (!targetCycleId) {
      const [activeCycle] = await this.db
        .select({
          id: performanceCycles.id,
          name: performanceCycles.name,
          startDate: performanceCycles.startDate,
          endDate: performanceCycles.endDate,
        })
        .from(performanceCycles)
        .where(
          and(
            eq(performanceCycles.companyId, user.companyId),
            eq(performanceCycles.status, 'active'),
          ),
        )
        .orderBy(desc(performanceCycles.startDate))
        .limit(1)
        .execute();

      if (!activeCycle) return [];
      targetCycleId = activeCycle.id;
    }

    return this.db
      .select({
        id: performanceAssessments.id,
        employeeId: performanceAssessments.revieweeId,
        type: performanceAssessments.type,
        status: performanceAssessments.status,
        submittedAt: performanceAssessments.submittedAt,
        createdAt: performanceAssessments.createdAt,
        reviewerId: performanceAssessments.reviewerId,
        revieweeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        reviewerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
        departmentName: departments.name,
        finalScore: assessmentConclusions.finalScore,
        promotionRecommendation: assessmentConclusions.promotionRecommendation,
        potentialFlag: assessmentConclusions.potentialFlag,
      })
      .from(performanceAssessments)
      .leftJoin(employees, eq(employees.id, performanceAssessments.revieweeId))
      .leftJoin(users, eq(users.id, performanceAssessments.reviewerId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .leftJoin(
        assessmentConclusions,
        eq(assessmentConclusions.assessmentId, performanceAssessments.id),
      )
      .where(
        and(
          eq(performanceAssessments.companyId, user.companyId),
          eq(performanceAssessments.cycleId, targetCycleId),
          employeeId
            ? eq(performanceAssessments.revieweeId, employeeId)
            : undefined,
          reviewerId
            ? eq(performanceAssessments.reviewerId, reviewerId)
            : undefined,
          departmentId ? eq(employees.departmentId, departmentId) : undefined,
          status
            ? eq(
                performanceAssessments.status,
                status as 'not_started' | 'in_progress' | 'submitted',
              )
            : undefined,
        ),
      )
      .orderBy(desc(performanceAssessments.submittedAt))
      .execute();
  }

  /**
   * Top employees (Performance cycle only now)
   */
  async getTopEmployees(user: User, filter: GetTopEmployeesDto) {
    const { departmentId, jobRoleId } = filter;

    // Latest active performance cycle
    const [latestCycle] = await this.db
      .select({
        id: performanceCycles.id,
        name: performanceCycles.name,
        startDate: performanceCycles.startDate,
      })
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.companyId, user.companyId),
          eq(performanceCycles.status, 'active'),
        ),
      )
      .orderBy(desc(performanceCycles.startDate))
      .limit(1)
      .execute();

    if (!latestCycle) return [];

    const where = [
      eq(performanceAssessments.cycleId, latestCycle.id),
      isNotNull(assessmentConclusions.finalScore),
    ];

    if (departmentId) where.push(eq(employees.departmentId, departmentId));
    if (jobRoleId) where.push(eq(employees.jobRoleId, jobRoleId));

    const rows = await this.db
      .select({
        employeeId: employees.id,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        departmentName: departments.name,
        jobRoleName: jobRoles.title,
        finalScore: assessmentConclusions.finalScore,
        promotionRecommendation: assessmentConclusions.promotionRecommendation,
        potentialFlag: assessmentConclusions.potentialFlag,
      })
      .from(performanceAssessments)
      .innerJoin(employees, eq(performanceAssessments.revieweeId, employees.id))
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .leftJoin(
        assessmentConclusions,
        eq(assessmentConclusions.assessmentId, performanceAssessments.id),
      )
      .where(and(...where))
      .orderBy(desc(assessmentConclusions.finalScore))
      .limit(10)
      .execute();

    // add a stable "source" for frontend badge
    return rows.map((r) => ({ ...r, source: 'performance' as const }));
  }

  /**
   * Performance Overview (NO appraisals)
   * Returns only performance-cycle-driven KPIs:
   * - performanceCycle (active)
   * - goalPerformance
   * - feedbackActivity
   * - assessmentActivity
   * - topEmployees (top performer)
   */
  async getPerformanceOverview(user: User) {
    // 1) Active performance cycle
    const [performanceCycle] = await this.db
      .select({
        id: performanceCycles.id,
        name: performanceCycles.name,
        startDate: performanceCycles.startDate,
        endDate: performanceCycles.endDate,
        status: performanceCycles.status,
      })
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.companyId, user.companyId),
          eq(performanceCycles.status, 'active'),
        ),
      )
      .orderBy(desc(performanceCycles.startDate))
      .limit(1)
      .execute();

    // If no active cycle, still return a safe object
    if (!performanceCycle) {
      return {
        performanceCycle: null,
        goalPerformance: { totalGoals: 0, completedGoals: 0, overdueGoals: 0 },
        feedbackActivity: {
          peerCount: 0,
          managerCount: 0,
          selfCount: 0,
          avgPerEmployee: 0,
          anonymityRate: 0,
        },
        assessmentActivity: {
          total: 0,
          submitted: 0,
          inProgress: 0,
          notStarted: 0,
          avgScore: 0,
          recommendationCounts: {},
        },
        topEmployees: [],
      };
    }

    // 2) Pull data in parallel
    const [goals, peerFeedback, mgrFeedback, selfFeedback, topEmployees] =
      await Promise.all([
        this.getGoalReport(user, { cycleId: performanceCycle.id }),
        this.getFeedbackReport(user, { type: 'peer' }),
        this.getFeedbackReport(user, { type: 'manager' }),
        this.getFeedbackReport(user, { type: 'employee' }),
        this.getTopEmployees(user, {
          cycleType: 'performance',
        }),
      ]);

    // 3) Goal KPIs
    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const overdueGoals = goals.filter(
      (g) => new Date(g.dueDate) < new Date() && g.status !== 'completed',
    ).length;

    // 4) Feedback KPIs
    const peerCount = peerFeedback.length;
    const managerCount = mgrFeedback.length;
    const selfCount = selfFeedback.length;

    const combinedFeedback = [...peerFeedback, ...mgrFeedback, ...selfFeedback];
    const uniqueEmployees = new Set(
      combinedFeedback.map((f) => f.recipientId).filter(Boolean),
    ).size;

    const totalFeedback = peerCount + managerCount + selfCount;
    const avgPerEmployee = uniqueEmployees
      ? totalFeedback / uniqueEmployees
      : 0;

    const anonymityCount =
      peerFeedback.filter((f) => f.isAnonymous).length +
      mgrFeedback.filter((f) => f.isAnonymous).length +
      selfFeedback.filter((f) => f.isAnonymous).length;

    const anonymityRate = totalFeedback ? anonymityCount / totalFeedback : 0;

    // 5) Assessment activity KPIs (cycle-scoped)
    const assessmentRows = await this.db
      .select({
        status: performanceAssessments.status,
        finalScore: assessmentConclusions.finalScore,
        promotionRecommendation: assessmentConclusions.promotionRecommendation,
      })
      .from(performanceAssessments)
      .leftJoin(
        assessmentConclusions,
        eq(assessmentConclusions.assessmentId, performanceAssessments.id),
      )
      .where(
        and(
          eq(performanceAssessments.companyId, user.companyId),
          eq(performanceAssessments.cycleId, performanceCycle.id),
        ),
      )
      .execute();

    const totalAssessments = assessmentRows.length;
    const submitted = assessmentRows.filter(
      (a) => a.status === 'submitted',
    ).length;
    const inProgress = assessmentRows.filter(
      (a) => a.status === 'in_progress',
    ).length;
    const notStarted = assessmentRows.filter(
      (a) => a.status === 'not_started',
    ).length;

    const scored = assessmentRows
      .map((a) => a.finalScore)
      .filter((v) => v != null) as number[];

    const avgScore = scored.length
      ? scored.reduce((s, v) => s + v, 0) / scored.length
      : 0;

    const recommendationCounts = assessmentRows.reduce(
      (acc, a) => {
        const r = (a.promotionRecommendation || 'none') as string;
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 6) Top performer (take #1 from list)
    const [topEmployee] = topEmployees;

    return {
      performanceCycle,
      goalPerformance: {
        totalGoals,
        completedGoals,
        overdueGoals,
      },
      feedbackActivity: {
        peerCount,
        managerCount,
        selfCount,
        avgPerEmployee,
        anonymityRate,
      },
      assessmentActivity: {
        total: totalAssessments,
        submitted,
        inProgress,
        notStarted,
        avgScore,
        recommendationCounts,
      },
      topEmployees: topEmployee ? [topEmployee] : [],
    };
  }
}
