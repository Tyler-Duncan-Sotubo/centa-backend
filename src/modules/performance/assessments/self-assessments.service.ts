import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, eq, inArray, desc } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';
import { User } from 'src/common/types/user.type';

import {
  employees,
  performanceCycles,
  performanceGoals,
  performanceGoalUpdates,
  performanceReviewTemplates,
  performanceTemplateQuestions,
  performanceReviewQuestions,
  performanceCompetencies,
} from 'src/drizzle/schema';

import { performanceAssessments } from './schema/performance-assessments.schema';
import { assessmentResponses } from './schema/performance-assessment-responses.schema';
import { assessmentSelfSummaries } from './schema/performance-assessment-self-summaries.schema';

@Injectable()
export class SelfAssessmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
  }

  private async getEmployeeOrThrow(user: User) {
    const [emp] = await this.db
      .select({
        id: employees.id,
        companyId: employees.companyId,
        firstName: employees.firstName,
        lastName: employees.lastName,
      })
      .from(employees)
      .where(
        and(
          eq(employees.userId, user.id),
          eq(employees.companyId, user.companyId),
        ),
      )
      .limit(1);

    if (!emp)
      throw new BadRequestException(
        'No employee record found for current user.',
      );
    return emp;
  }

  private async getCycleOrThrow(companyId: string, cycleId: string) {
    const [cycle] = await this.db
      .select({
        id: performanceCycles.id,
        name: performanceCycles.name,
        startDate: performanceCycles.startDate,
        endDate: performanceCycles.endDate,
        companyId: performanceCycles.companyId,
      })
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.id, cycleId),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .limit(1);

    if (!cycle) throw new NotFoundException('Cycle not found');
    return cycle;
  }

  private async pickSelfTemplateOrThrow(companyId: string) {
    // ✅ Replace selector if you add a "self template" flag later.
    const [tpl] = await this.db
      .select({
        id: performanceReviewTemplates.id,
        name: performanceReviewTemplates.name,
        includeGoals: (performanceReviewTemplates as any).includeGoals,
        includeQuestionnaire: (performanceReviewTemplates as any)
          .includeQuestionnaire,
      } as any)
      .from(performanceReviewTemplates)
      .where(eq(performanceReviewTemplates.companyId, companyId))
      .limit(1);

    if (!tpl) throw new BadRequestException('No self template configured');
    return tpl as any;
  }

  private async getOrCreateSelfAssessment(user: User, cycleId: string) {
    const emp = await this.getEmployeeOrThrow(user);
    await this.getCycleOrThrow(user.companyId, cycleId);
    const template = await this.pickSelfTemplateOrThrow(user.companyId);

    const [existing] = await this.db
      .select()
      .from(performanceAssessments)
      .where(
        and(
          eq(performanceAssessments.companyId, user.companyId),
          eq(performanceAssessments.cycleId, cycleId),
          eq(performanceAssessments.type, 'self'),
          eq(performanceAssessments.reviewerId, user.id),
          eq(performanceAssessments.revieweeId, emp.id),
        ),
      )
      .limit(1);

    if (existing) return { assessment: existing as any, template, emp };

    const [created] = await this.db
      .insert(performanceAssessments)
      .values({
        companyId: user.companyId,
        cycleId,
        templateId: template.id,
        reviewerId: user.id,
        revieweeId: emp.id,
        type: 'self',
        status: 'not_started',
        createdAt: new Date(),
      } as any)
      .returning();

    await this.invalidate(user.companyId);
    return { assessment: created as any, template, emp };
  }

  async getSelfAssessmentPayload(user: User, cycleId: string) {
    const { assessment, template, emp } = await this.getOrCreateSelfAssessment(
      user,
      cycleId,
    );

    const questions = template.includeQuestionnaire
      ? await this.getQuestionsWithResponses(assessment.id, template.id)
      : null;

    const goals = template.includeGoals
      ? await this.getGoalsForEmployeeCycle(emp.id, assessment.cycleId)
      : null;

    const [selfSummary] = await this.db
      .select({
        summary: assessmentSelfSummaries.summary,
        updatedAt: assessmentSelfSummaries.updatedAt,
      })
      .from(assessmentSelfSummaries)
      .where(eq(assessmentSelfSummaries.assessmentId, assessment.id))
      .limit(1);

    return {
      assessment,
      employee: {
        id: emp.id,
        name: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
      },
      template: {
        id: template.id,
        name: template.name,
        includeGoals: !!template.includeGoals,
        includeQuestionnaire: !!template.includeQuestionnaire,
      },
      questions,
      goals,
      selfSummary: selfSummary ?? null,
    };
  }

  async upsertSelfSummary(user: User, assessmentId: string, summary: string) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.companyId !== user.companyId)
      throw new ForbiddenException('Forbidden');
    if (assessment.type !== 'self')
      throw new BadRequestException('Not a self assessment');
    if (assessment.reviewerId !== user.id)
      throw new ForbiddenException('Not authorized');
    if (assessment.status === 'submitted')
      throw new BadRequestException('Submitted and locked');

    const now = new Date();

    const [existing] = await this.db
      .select({ id: assessmentSelfSummaries.id })
      .from(assessmentSelfSummaries)
      .where(eq(assessmentSelfSummaries.assessmentId, assessmentId))
      .limit(1);

    if (!existing) {
      const [created] = await this.db
        .insert(assessmentSelfSummaries)
        .values({
          assessmentId,
          summary: summary ?? '',
          createdAt: now,
          updatedAt: now,
          createdBy: user.id,
          updatedBy: user.id,
        } as any)
        .returning();

      await this.invalidate(user.companyId);
      return created;
    }

    const [updated] = await this.db
      .update(assessmentSelfSummaries)
      .set({
        summary: summary ?? '',
        updatedAt: now,
        updatedBy: user.id,
      } as any)
      .where(eq(assessmentSelfSummaries.assessmentId, assessmentId))
      .returning();

    await this.invalidate(user.companyId);
    return updated;
  }

  async startSelfAssessment(user: User, assessmentId: string) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.companyId !== user.companyId)
      throw new ForbiddenException('Forbidden');
    if (assessment.type !== 'self')
      throw new BadRequestException('Not a self assessment');
    if (assessment.reviewerId !== user.id)
      throw new ForbiddenException('Not authorized');
    if (assessment.status !== 'not_started')
      throw new BadRequestException('Already started/submitted');

    await this.db
      .update(performanceAssessments)
      .set({ status: 'in_progress' })
      .where(eq(performanceAssessments.id, assessmentId));

    await this.invalidate(user.companyId);
    return { success: true };
  }

  async submitSelfAssessment(user: User, assessmentId: string) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!assessment) throw new NotFoundException('Assessment not found');
    if (assessment.companyId !== user.companyId)
      throw new ForbiddenException('Forbidden');
    if (assessment.type !== 'self')
      throw new BadRequestException('Not a self assessment');
    if (assessment.reviewerId !== user.id)
      throw new ForbiddenException('Not authorized');
    if (assessment.status === 'submitted')
      throw new BadRequestException('Already submitted');

    const [updated] = await this.db
      .update(performanceAssessments)
      .set({ status: 'submitted', submittedAt: new Date() } as any)
      .where(eq(performanceAssessments.id, assessmentId))
      .returning();

    await this.invalidate(user.companyId);
    return updated;
  }

  private async getQuestionsWithResponses(
    assessmentId: string,
    templateId: string,
  ) {
    const rows = await this.db
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
          eq(assessmentResponses.assessmentId, assessmentId),
          eq(assessmentResponses.questionId, performanceReviewQuestions.id),
        ),
      )
      .leftJoin(
        performanceCompetencies,
        eq(performanceCompetencies.id, performanceReviewQuestions.competencyId),
      )
      .where(eq(performanceTemplateQuestions.templateId, templateId))
      .orderBy(performanceTemplateQuestions.order);

    return rows.reduce(
      (acc, q) => {
        const key = q.competency || 'Uncategorized';
        if (!acc[key]) acc[key] = [];
        acc[key].push(q);
        return acc;
      },
      {} as Record<string, typeof rows>,
    );
  }

  private async getGoalsForEmployeeCycle(employeeId: string, cycleId: string) {
    const goals = await this.db
      .select({
        id: performanceGoals.id,
        title: performanceGoals.title,
        dueDate: performanceGoals.dueDate,
        weight: performanceGoals.weight,
        status: performanceGoals.status,
      })
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.employeeId, employeeId),
          eq(performanceGoals.cycleId, cycleId),
          inArray(performanceGoals.status, ['active', 'completed']),
        ),
      )
      .orderBy(desc(performanceGoals.assignedAt));

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
      .orderBy(desc(performanceGoalUpdates.createdAt));

    const progressMap = new Map<string, number>();
    for (const u of latestProgress)
      if (!progressMap.has(u.goalId)) progressMap.set(u.goalId, u.progress);

    return goals.map((g) => ({ ...g, progress: progressMap.get(g.id) ?? 0 }));
  }
}
