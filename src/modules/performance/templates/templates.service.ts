import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  performanceCompetencies,
  performanceReviewQuestions,
  performanceReviewTemplates,
  performanceTemplateQuestions,
} from '../schema';

@Injectable()
export class PerformanceTemplatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(user: User, dto: CreateTemplateDto) {
    const { companyId, id: userId } = user;
    const [template] = await this.db
      .insert(performanceReviewTemplates)
      .values({
        companyId,
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault ?? false,
        includeGoals: dto.includeGoals ?? false,
        includeAttendance: dto.includeAttendance ?? false,
        includeFeedback: dto.includeFeedback ?? false,
        includeQuestionnaire: dto.includeQuestionnaire ?? false,
        requireSignature: dto.requireSignature ?? false,
        restrictVisibility: dto.restrictVisibility ?? false,
        createdAt: new Date(),
      })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_review_template',
      entityId: template.id,
      userId,
      details: `Created performance review template: ${template.name}`,
      changes: {
        name: template.name,
        description: template.description,
        isDefault: template.isDefault,
        includeGoals: template.includeGoals,
        includeAttendance: template.includeAttendance,
        includeFeedback: template.includeFeedback,
        includeQuestionnaire: template.includeQuestionnaire,
        requireSignature: template.requireSignature,
        restrictVisibility: template.restrictVisibility,
      },
    });

    return template;
  }

  findAll(companyId: string) {
    return this.db
      .select()
      .from(performanceReviewTemplates)
      .where(eq(performanceReviewTemplates.companyId, companyId));
  }

  async findOne(id: string, companyId: string) {
    const template = await this.db.query.performanceReviewTemplates.findFirst({
      where: (tpl, { eq }) => eq(tpl.id, id),
    });

    if (!template) throw new NotFoundException('Template not found');

    const questions = await this.db
      .select({
        id: performanceReviewQuestions.id,
        question: performanceReviewQuestions.question,
        type: performanceReviewQuestions.type,
        isMandatory: performanceTemplateQuestions.isMandatory,
        order: performanceTemplateQuestions.order,
        competencyId: performanceReviewQuestions.competencyId,
        competencyName: performanceCompetencies.name,
      })
      .from(performanceTemplateQuestions)
      .innerJoin(
        performanceReviewQuestions,
        eq(
          performanceTemplateQuestions.questionId,
          performanceReviewQuestions.id,
        ),
      )
      .innerJoin(
        performanceReviewTemplates,
        eq(
          performanceTemplateQuestions.templateId,
          performanceReviewTemplates.id,
        ),
      )
      .leftJoin(
        performanceCompetencies,
        eq(performanceReviewQuestions.competencyId, performanceCompetencies.id),
      )
      .where(
        and(
          eq(performanceTemplateQuestions.templateId, id),
          eq(performanceReviewTemplates.companyId, companyId),
        ),
      )
      .orderBy(performanceTemplateQuestions.order);

    return { ...template, questions };
  }

  async getById(id: string, companyId: string) {
    const [template] = await this.db
      .select()
      .from(performanceReviewTemplates)
      .where(
        and(
          eq(performanceReviewTemplates.id, id),
          eq(performanceReviewTemplates.companyId, companyId),
        ),
      );

    if (!template) throw new NotFoundException('Template not found');

    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto, user: User) {
    await this.getById(id, user.companyId);
    const [updated] = await this.db
      .update(performanceReviewTemplates)
      .set({ ...updateTemplateDto })
      .where(eq(performanceReviewTemplates.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_review_template',
      entityId: id,
      userId: user.id,
      details: `Updated performance review template: ${updated.name}`,
      changes: {
        name: updated.name,
        description: updated.description,
        isDefault: updated.isDefault,
        includeGoals: updated.includeGoals,
        includeAttendance: updated.includeAttendance,
        includeFeedback: updated.includeFeedback,
        includeQuestionnaire: updated.includeQuestionnaire,
        requireSignature: updated.requireSignature,
        restrictVisibility: updated.restrictVisibility,
      },
    });

    return updated;
  }

  async remove(id: string, user: User) {
    const template = await this.getById(id, user.companyId);
    await this.db
      .delete(performanceReviewTemplates)
      .where(eq(performanceReviewTemplates.id, id));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_review_template',
      entityId: id,
      userId: user.id,
      details: `Deleted performance review template: ${template.name}`,
    });
  }

  async assignQuestions(templateId: string, questionIds: string[], user: User) {
    await this.db
      .delete(performanceTemplateQuestions)
      .where(eq(performanceTemplateQuestions.templateId, templateId));

    const payload = questionIds.map((qid, index) => ({
      templateId,
      questionId: qid,
      order: index,
      isMandatory: true, // You can allow this to be passed in as well
    }));

    await this.db.insert(performanceTemplateQuestions).values(payload);

    await this.auditService.logAction({
      action: 'assign_questions',
      entity: 'performance_review_template',
      entityId: templateId,
      userId: user.id,
      details: `Assigned ${payload.length} questions to template ${templateId}`,
    });

    return { success: true, count: payload.length };
  }

  async removeQuestion(templateId: string, questionId: string, user: User) {
    await this.db
      .delete(performanceTemplateQuestions)
      .where(
        and(
          eq(performanceTemplateQuestions.templateId, templateId),
          eq(performanceTemplateQuestions.questionId, questionId),
        ),
      );

    await this.auditService.logAction({
      action: 'remove_question',
      entity: 'performance_review_template',
      entityId: templateId,
      userId: user.id,
      details: `Removed question ${questionId} from template ${templateId}`,
    });

    return { success: true };
  }

  async seedDefaultTemplate(companyId: string) {
    // Step 1: Create the template
    const [template] = await this.db
      .insert(performanceReviewTemplates)
      .values({
        companyId,
        name: 'Default Performance Review',
        description:
          'A general-purpose review template suitable for most roles.',
        isDefault: true,
        includeGoals: false,
        includeAttendance: true,
        includeFeedback: false,
        includeQuestionnaire: true,
        requireSignature: true,
        restrictVisibility: false,
        createdAt: new Date(),
      })
      .returning();

    if (!template) return;

    // Step 2: Attach curated global questions
    const questionTexts = [
      'How clearly does the employee communicate in verbal interactions?',
      'Does the employee communicate effectively in writing?',
      'How well does the employee support team members?',
      'Can the employee identify the root cause of issues?',
      'Describe how the employee approaches problem solving.',
      'Does the employee demonstrate strong knowledge of their job?',
      'Is the employee up to date with industry best practices?',
      'Rate the employee’s efficiency in completing tasks.',
    ];

    const questionIds = await this.lookupQuestionIds(this.db, questionTexts);

    const payload = questionIds.map((qid, i) => ({
      templateId: template.id,
      questionId: qid,
      order: i,
      isMandatory: true,
    }));

    await this.db.insert(performanceTemplateQuestions).values(payload);
  }

  lookupQuestionIds = async (
    db: db,
    questions: string[],
    companyId?: string,
  ) => {
    const rows = await db.query.performanceReviewQuestions.findMany({
      where: (q, { and, eq, isNull }) =>
        and(
          companyId ? eq(q.companyId, companyId) : isNull(q.companyId),
          eq(q.isGlobal, true),
        ),
    });

    const matchedIds: string[] = [];

    for (const text of questions) {
      const match = rows.find((q) => q.question === text);
      if (match) matchedIds.push(match.id);
      else console.warn(`⚠️ Question not found: ${text}`);
    }

    return matchedIds;
  };
}
