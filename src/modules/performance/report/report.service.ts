import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, sql, isNotNull, gte, inArray, desc } from 'drizzle-orm';
import {
  competencyLevels,
  departments,
  employees,
  jobRoles,
  performanceCompetencies,
  performanceCycles,
  performanceGoals,
  users,
} from 'src/drizzle/schema';
import { appraisals } from '../appraisals/schema/performance-appraisals.schema';
import { User } from 'src/common/types/user.type';
import { performanceAppraisalCycles } from '../appraisals/schema/performance-appraisal-cycle.schema';
import { GetAppraisalReportDto } from './dto/get-appraisal-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { performanceFeedback } from '../feedback/schema/performance-feedback.schema';
import { feedbackResponses } from '../feedback/schema/performance-feedback-responses.schema';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { performanceAssessments } from '../assessments/schema/performance-assessments.schema';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { assessmentConclusions } from '../assessments/schema/performance-assessment-conclusions.schema';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { appraisalEntries } from '../appraisals/schema/performance-appraisals-entries.schema';
import { feedbackQuestions } from '../feedback/schema/performance-feedback-questions.schema';

@Injectable()
export class ReportService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async reportFilters(companyId: string) {
    // Fetch all necessary filter options
    const cycles = await this.db
      .select({ id: performanceCycles.id, name: performanceCycles.name })
      .from(performanceCycles)
      .where(eq(performanceCycles.companyId, companyId))
      .orderBy(desc(performanceCycles.startDate))
      .execute();

    const appraisalCycles = await this.db
      .select({
        id: performanceAppraisalCycles.id,
        name: performanceAppraisalCycles.name,
      })
      .from(performanceAppraisalCycles)
      .where(eq(performanceAppraisalCycles.companyId, companyId))
      .orderBy(desc(performanceAppraisalCycles.startDate))
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

    return { cycles, employeesList, departmentsList, appraisalCycles };
  }

  async getAppraisalReport(user: User, filters?: GetAppraisalReportDto) {
    const { cycleId, employeeId, departmentId, minimumScore } = filters || {};

    let targetCycleId = cycleId;

    // If no cycleId provided, find the active one
    if (!targetCycleId) {
      const [activeCycle] = await this.db
        .select({
          id: performanceAppraisalCycles.id,
          name: performanceAppraisalCycles.name,
          startDate: performanceAppraisalCycles.startDate,
          endDate: performanceAppraisalCycles.endDate,
          status: performanceAppraisalCycles.status,
        })
        .from(performanceAppraisalCycles)
        .where(
          and(
            eq(performanceAppraisalCycles.companyId, user.companyId),
            eq(performanceAppraisalCycles.status, 'active'),
          ),
        )
        .orderBy(desc(performanceAppraisalCycles.startDate))
        .limit(1)
        .execute();

      if (!activeCycle) {
        return [];
      }

      targetCycleId = activeCycle.id;
    }

    // Now use targetCycleId for the report query
    const report = await this.db
      .select({
        cycleId: performanceAppraisalCycles.id,
        cycleName: performanceAppraisalCycles.name,
        appraisalId: appraisals.id,
        employeeId: employees.id,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        jobRoleName: jobRoles.title,
        departmentName: departments.name,
        appraisalNote: appraisals.finalNote,
        appraisalScore: appraisals.finalScore,
        promotionRecommendation: appraisals.promotionRecommendation,
        submittedAt: appraisals.createdAt,
      })
      .from(appraisals)
      .innerJoin(employees, eq(employees.id, appraisals.employeeId))
      .innerJoin(
        performanceAppraisalCycles,
        eq(performanceAppraisalCycles.id, appraisals.cycleId),
      )
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(
        and(
          eq(appraisals.companyId, user.companyId),
          targetCycleId ? eq(appraisals.cycleId, targetCycleId) : undefined,
          employeeId ? eq(appraisals.employeeId, employeeId) : undefined,
          departmentId ? eq(employees.departmentId, departmentId) : undefined,
          minimumScore !== undefined
            ? gte(appraisals.finalScore, minimumScore)
            : undefined,
        ),
      )
      .execute();

    return report;
  }

  async getGoalReport(user: User, filters?: GetGoalReportDto) {
    const { cycleId, employeeId, departmentId, status, minimumWeight } =
      filters || {};

    let targetCycleId = cycleId;

    // If no cycleId provided, find the active one
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

      if (!activeCycle) {
        return [];
      }

      targetCycleId = activeCycle.id;
    }

    // Now use targetCycleId for the report query
    const report = await this.db
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

    return report;
  }

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
      if (!groupedResponses[r.feedbackId]) {
        groupedResponses[r.feedbackId] = [];
      }
      groupedResponses[r.feedbackId].push({
        questionText: r.questionText,
        answer: r.answer,
        order: r.order ?? 0,
      });
    }

    // Step 4: Merge into report
    const report = feedbackEntries.map((entry) => ({
      ...entry,
      senderName: entry.isAnonymous ? undefined : entry.senderName,
      responses: groupedResponses[entry.feedbackId] || [],
    }));

    return report;
  }

  async getAssessmentReportSummary(
    user: User,
    filters?: GetAssessmentReportDto,
  ) {
    const { cycleId, employeeId, reviewerId, departmentId, status } =
      filters || {};

    let targetCycleId = cycleId;

    // If no cycleId provided, find the active cycle
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

      if (!activeCycle) {
        return [];
      }

      targetCycleId = activeCycle.id;
    }

    const result = await this.db
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
    return result;
  }

  async getTopEmployees(user: User, filter: GetTopEmployeesDto) {
    const { cycleType = 'appraisal', departmentId, jobRoleId } = filter;

    const isAppraisal = cycleType === 'appraisal';

    // Step 1: Get latest active cycle
    const [latestCycle] = await this.db
      .select()
      .from(isAppraisal ? performanceAppraisalCycles : performanceCycles)
      .where(
        and(
          eq(
            isAppraisal
              ? performanceAppraisalCycles.companyId
              : performanceCycles.companyId,
            user.companyId,
          ),
          eq(
            isAppraisal
              ? performanceAppraisalCycles.status
              : performanceCycles.status,
            'active',
          ),
        ),
      )
      .orderBy(
        desc(
          isAppraisal
            ? performanceAppraisalCycles.startDate
            : performanceCycles.startDate,
        ),
      )
      .limit(1)
      .execute();

    if (!latestCycle) return [];

    // Use appraisal path
    if (isAppraisal) {
      const where = [
        eq(appraisals.cycleId, latestCycle.id),
        isNotNull(appraisals.finalScore),
      ];

      if (departmentId) where.push(eq(employees.departmentId, departmentId));
      if (jobRoleId) where.push(eq(employees.jobRoleId, jobRoleId));

      return this.db
        .select({
          employeeId: employees.id,
          employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
          departmentName: departments.name,
          jobRoleName: jobRoles.title,
          finalScore: appraisals.finalScore,
          promotionRecommendation: appraisals.promotionRecommendation,
        })
        .from(appraisals)
        .innerJoin(employees, eq(appraisals.employeeId, employees.id))
        .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
        .leftJoin(departments, eq(departments.id, employees.departmentId))
        .where(and(...where))
        .orderBy(desc(appraisals.finalScore))
        .limit(10)
        .execute();
    }

    // Use performance assessment path
    const where = [
      eq(performanceAssessments.cycleId, latestCycle.id),
      isNotNull(assessmentConclusions.finalScore),
    ];

    if (departmentId) where.push(eq(employees.departmentId, departmentId));
    if (jobRoleId) where.push(eq(employees.jobRoleId, jobRoleId));

    return this.db
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
  }

  async getCompetencyHeatmap(user: User, filters?: { cycleId: string }) {
    let targetCycleId = filters?.cycleId;

    if (!targetCycleId) {
      const [activeCycle] = await this.db
        .select({
          id: performanceAppraisalCycles.id,
          name: performanceAppraisalCycles.name,
          startDate: performanceAppraisalCycles.startDate,
          endDate: performanceAppraisalCycles.endDate,
          status: performanceAppraisalCycles.status,
        })
        .from(performanceAppraisalCycles)
        .where(
          and(
            eq(performanceAppraisalCycles.companyId, user.companyId),
            eq(performanceAppraisalCycles.status, 'active'),
          ),
        )
        .orderBy(desc(performanceAppraisalCycles.startDate))
        .limit(1)
        .execute();

      if (!activeCycle) {
        return [];
      }

      targetCycleId = activeCycle.id;
    }

    const result = await this.db
      .select({
        competencyName: performanceCompetencies.name,
        levelName: competencyLevels.name,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(appraisalEntries)
      .innerJoin(appraisals, eq(appraisals.id, appraisalEntries.appraisalId))
      .innerJoin(
        performanceCompetencies,
        eq(performanceCompetencies.id, appraisalEntries.competencyId),
      )
      .leftJoin(
        competencyLevels,
        eq(competencyLevels.id, appraisalEntries.employeeLevelId),
      )
      .where(eq(appraisals.cycleId, targetCycleId))
      .groupBy(performanceCompetencies.name, competencyLevels.name)
      .orderBy(performanceCompetencies.name, competencyLevels.name)
      .execute();

    // Transform to heatmap shape
    const heatmap: Record<string, { [level: string]: number }> = {};

    for (const row of result) {
      if (!heatmap[row.competencyName]) {
        heatmap[row.competencyName] = {};
      }
      heatmap[row.competencyName][row.levelName ?? 'Unrated'] = row.count;
    }

    return heatmap;
  }

  async getParticipationReport(user: User, filters?: { cycleId?: string }) {
    let targetCycleId = filters?.cycleId;

    if (!targetCycleId) {
      const [activeCycle] = await this.db
        .select({ id: performanceCycles.id })
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

    const rows = await this.db
      .select({
        employeeId: employees.id,
        employeeName: sql<string>`
        concat(${employees.firstName}, ' ', ${employees.lastName})
      `,
        submittedByEmployee: appraisals.submittedByEmployee,
        submittedByManager: appraisals.submittedByManager,
        finalized: appraisals.finalized,
      })
      .from(appraisals)
      .innerJoin(employees, eq(appraisals.employeeId, employees.id))
      .where(
        and(
          eq(appraisals.companyId, user.companyId),
          eq(appraisals.cycleId, targetCycleId),
        ),
      )
      .execute();

    // Add a derived "completed" flag: both self and manager have submitted
    return rows.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      submittedByEmployee: r.submittedByEmployee,
      submittedByManager: r.submittedByManager,
      finalized: r.finalized,
      completed: Boolean(r.submittedByEmployee && r.submittedByManager),
    }));
  }

  async getPerformanceOverview(user: User) {
    // 1. Fetch active appraisal cycle & performance cycle in parallel
    const [appraisalCycle] = await this.db
      .select({
        id: performanceAppraisalCycles.id,
        name: performanceAppraisalCycles.name,
        startDate: performanceAppraisalCycles.startDate,
        endDate: performanceAppraisalCycles.endDate,
        status: performanceAppraisalCycles.status,
      })
      .from(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.companyId, user.companyId),
          eq(performanceAppraisalCycles.status, 'active'),
        ),
      )
      .orderBy(desc(performanceAppraisalCycles.startDate))
      .limit(1)
      .execute();

    const [performanceCycle] = await this.db
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

    // 2. If neither cycle exists, bail with empty
    if (!appraisalCycle && !performanceCycle) {
      return [];
    }

    // 2. Kick off all report queries in parallel
    const [
      appraisals,
      goals,
      peerFeedback,
      mgrFeedback,
      selfFeedback,
      participationRecords,
      heatmap,
      topEmployees,
    ] = await Promise.all([
      this.getAppraisalReport(user),
      this.getGoalReport(user, {}),
      this.getFeedbackReport(user, { type: 'peer' }),
      this.getFeedbackReport(user, { type: 'manager' }),
      this.getFeedbackReport(user, { type: 'employee' }),
      this.getParticipationReport(user),
      this.getCompetencyHeatmap(user, {
        cycleId: '',
      }),
      this.getTopEmployees(user, { cycleType: 'appraisal' }),
    ]);

    // 3. Compute Cycle Health
    const totalAppraisals = appraisals.length;
    const completedAppraisals = appraisals.filter(
      (a) => a.appraisalScore != null,
    ).length;
    const completionRate = totalAppraisals
      ? completedAppraisals / totalAppraisals
      : 0;

    const onTimeCount = appraisals.filter(
      (a) =>
        a.submittedAt &&
        new Date(a.submittedAt) <= new Date(appraisalCycle.endDate),
    ).length;
    const overdueCount = completedAppraisals - onTimeCount;

    const avgTimeToCompleteDays = completedAppraisals
      ? appraisals
          .filter((a) => a.submittedAt)
          .reduce((sum, a) => {
            if (!a.submittedAt) return sum;
            const days =
              (new Date(a.submittedAt as unknown as string).getTime() -
                new Date(appraisalCycle.startDate).getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedAppraisals
      : 0;

    // 4. Appraisal Outcomes
    const scores = appraisals
      .map((a) => a.appraisalScore ?? 0)
      .filter((s) => s != null);

    const avgScore = scores.length
      ? scores.reduce((sum, v) => sum + v, 0) / scores.length
      : 0;

    const buckets = { '0-50': 0, '51-70': 0, '71-85': 0, '86-100': 0 };
    scores.forEach((s) => {
      if (s <= 50) buckets['0-50']++;
      else if (s <= 70) buckets['51-70']++;
      else if (s <= 85) buckets['71-85']++;
      else buckets['86-100']++;
    });

    const recommendationCounts = appraisals.reduce(
      (acc, a) => {
        const r = a.promotionRecommendation || 'none';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 5. Goal Performance
    const totalGoals = goals.length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    const overdueGoals = goals.filter(
      (g) => new Date(g.dueDate) < new Date() && g.status !== 'completed',
    ).length;

    // 6. Feedback Activity
    const peerCount = peerFeedback.length;
    const managerCount = mgrFeedback.length;
    const selfCount = selfFeedback.length;
    const uniqueEmployees = new Set(
      [...peerFeedback, ...mgrFeedback, ...selfFeedback].map(
        (f) => f.recipientId,
      ),
    ).size;
    const totalFeedback = peerCount + managerCount + selfCount;
    const avgPerEmployee = uniqueEmployees
      ? totalFeedback / uniqueEmployees
      : 0;
    const anonymityRate = totalFeedback
      ? (peerFeedback.filter((f) => f.isAnonymous).length +
          mgrFeedback.filter((f) => f.isAnonymous).length +
          selfFeedback.filter((f) => f.isAnonymous).length) /
        totalFeedback
      : 0;

    // 7. Participation
    const totalParticipants = participationRecords.length;
    const completedParticipants = participationRecords.filter(
      (p) => p.completed,
    ).length;
    const participationRate = totalParticipants
      ? completedParticipants / totalParticipants
      : 0;

    // 8. Package all metrics
    return {
      appraisalCycle,
      cycleHealth: {
        totalAppraisals,
        completedAppraisals,
        completionRate,
        onTimeCount,
        overdueCount,
        avgTimeToCompleteDays,
      },
      appraisalOutcomes: {
        avgScore,
        scoreDistribution: buckets,
        recommendationCounts,
      },
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
      competencyInsights: {
        heatmap,
      },
      participation: {
        total: totalParticipants,
        completed: completedParticipants,
        completionRate: participationRate,
      },
      topEmployees: topEmployees,
    };
  }
}
