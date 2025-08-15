import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, eq, inArray, asc } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  performanceCompetencies,
  performanceReviewQuestions,
  performanceReviewTemplates,
  performanceTemplateQuestions,
} from '../schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PerformanceTemplatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  // ----- cache helpers -----
  private ns() {
    // DO NOT include companyId here; getOrSetVersioned handles company scoping
    return ['performance', 'templates'] as const;
  }
  private tags(companyId: string) {
    return [`company:${companyId}`, 'performance', 'performance:templates'];
  }
  private async bump(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // optional; becomes a no-op without native Redis
    await this.cache.invalidateTags(this.tags(companyId));
  }

  async create(user: User, dto: CreateTemplateDto) {
    const { companyId, id: userId } = user;

    // unique name per company
    const [dup] = await this.db
      .select({ id: performanceReviewTemplates.id })
      .from(performanceReviewTemplates)
      .where(
        and(
          eq(performanceReviewTemplates.companyId, companyId),
          eq(performanceReviewTemplates.name, dto.name),
        ),
      )
      .execute();
    if (dup)
      throw new BadRequestException('A template with this name already exists');

    const created = await this.db.transaction(async (trx) => {
      // if this becomes default, unset previous defaults for this company
      if (dto.isDefault) {
        await trx
          .update(performanceReviewTemplates)
          .set({ isDefault: false })
          .where(eq(performanceReviewTemplates.companyId, companyId))
          .execute();
      }

      const [template] = await trx
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
        .returning()
        .execute();

      return template;
    });

    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_review_template',
      entityId: created.id,
      userId,
      details: `Created performance review template: ${created.name}`,
      changes: {
        name: created.name,
        description: created.description,
        isDefault: created.isDefault,
        includeGoals: created.includeGoals,
        includeAttendance: created.includeAttendance,
        includeFeedback: created.includeFeedback,
        includeQuestionnaire: created.includeQuestionnaire,
        requireSignature: created.requireSignature,
        restrictVisibility: created.restrictVisibility,
      },
    });

    await this.bump(companyId);
    return created;
  }

  findAll(companyId: string) {
    const key = [...this.ns(), 'all'] as const;
    return this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () =>
        this.db
          .select()
          .from(performanceReviewTemplates)
          .where(eq(performanceReviewTemplates.companyId, companyId))
          .orderBy(asc(performanceReviewTemplates.name))
          .execute(),
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string, companyId: string) {
    const key = [...this.ns(), 'one', id] as const;
    const data = await this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () => {
        // secure: scope template to companyId
        const [template] = await this.db
          .select()
          .from(performanceReviewTemplates)
          .where(
            and(
              eq(performanceReviewTemplates.id, id),
              eq(performanceReviewTemplates.companyId, companyId),
            ),
          )
          .execute();

        if (!template) return null;

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
          .leftJoin(
            performanceCompetencies,
            eq(
              performanceReviewQuestions.competencyId,
              performanceCompetencies.id,
            ),
          )
          .where(eq(performanceTemplateQuestions.templateId, id))
          .orderBy(performanceTemplateQuestions.order)
          .execute();

        return { template, questions };
      },
      { tags: this.tags(companyId) },
    );

    if (!data) throw new NotFoundException('Template not found');
    return { ...data.template, questions: data.questions };
  }

  /** lightweight getter used internally to validate & enforce company scope */
  private async getById(id: string, companyId: string) {
    const [template] = await this.db
      .select()
      .from(performanceReviewTemplates)
      .where(
        and(
          eq(performanceReviewTemplates.id, id),
          eq(performanceReviewTemplates.companyId, companyId),
        ),
      )
      .execute();
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto, user: User) {
    const { companyId } = await this.getById(id, user.companyId);

    const updated = await this.db.transaction(async (trx) => {
      if (updateTemplateDto.isDefault === true) {
        await trx
          .update(performanceReviewTemplates)
          .set({ isDefault: false })
          .where(eq(performanceReviewTemplates.companyId, companyId))
          .execute();
      }

      const [row] = await trx
        .update(performanceReviewTemplates)
        .set({ ...updateTemplateDto })
        .where(
          and(
            eq(performanceReviewTemplates.id, id),
            eq(performanceReviewTemplates.companyId, companyId),
          ),
        )
        .returning()
        .execute();
      return row;
    });

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

    await this.bump(companyId);
    return updated;
  }

  async remove(id: string, user: User) {
    const template = await this.getById(id, user.companyId);

    await this.db.transaction(async (trx) => {
      // delete questions explicitly (in case FK isn’t cascading)
      await trx
        .delete(performanceTemplateQuestions)
        .where(eq(performanceTemplateQuestions.templateId, id))
        .execute();

      await trx
        .delete(performanceReviewTemplates)
        .where(
          and(
            eq(performanceReviewTemplates.id, id),
            eq(performanceReviewTemplates.companyId, user.companyId),
          ),
        )
        .execute();
    });

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_review_template',
      entityId: id,
      userId: user.id,
      details: `Deleted performance review template: ${template.name}`,
    });

    await this.bump(user.companyId);
    return { success: true };
  }

  async assignQuestions(templateId: string, questionIds: string[], user: User) {
    // ensure template belongs to user’s company
    const template = await this.getById(templateId, user.companyId);

    // validate questions belong to same company or are global
    const questions = await this.db
      .select({
        id: performanceReviewQuestions.id,
        companyId: performanceReviewQuestions.companyId,
        isGlobal: performanceReviewQuestions.isGlobal,
      })
      .from(performanceReviewQuestions)
      .where(inArray(performanceReviewQuestions.id, questionIds))
      .execute();

    const unknown = questionIds.filter(
      (id) => !questions.find((q) => q.id === id),
    );
    if (unknown.length)
      throw new BadRequestException(
        `Unknown question IDs: ${unknown.join(', ')}`,
      );

    const invalid = questions.filter(
      (q) => !(q.isGlobal || q.companyId === template.companyId),
    );
    if (invalid.length)
      throw new BadRequestException(
        'Some questions do not belong to this company',
      );

    await this.db.transaction(async (trx) => {
      await trx
        .delete(performanceTemplateQuestions)
        .where(eq(performanceTemplateQuestions.templateId, templateId))
        .execute();

      const payload = questionIds.map((qid, index) => ({
        templateId,
        questionId: qid,
        order: index,
        isMandatory: true,
      }));

      if (payload.length) {
        await trx
          .insert(performanceTemplateQuestions)
          .values(payload)
          .execute();
      }
    });

    await this.auditService.logAction({
      action: 'assign_questions',
      entity: 'performance_review_template',
      entityId: templateId,
      userId: user.id,
      details: `Assigned ${questionIds.length} questions to template ${templateId}`,
    });

    await this.bump(user.companyId);
    return { success: true, count: questionIds.length };
  }

  async removeQuestion(templateId: string, questionId: string, user: User) {
    await this.getById(templateId, user.companyId);

    await this.db
      .delete(performanceTemplateQuestions)
      .where(
        and(
          eq(performanceTemplateQuestions.templateId, templateId),
          eq(performanceTemplateQuestions.questionId, questionId),
        ),
      )
      .execute();

    // reorder remaining to keep order compact
    const remaining = await this.db
      .select({
        id: performanceTemplateQuestions.questionId,
        order: performanceTemplateQuestions.order,
      })
      .from(performanceTemplateQuestions)
      .where(eq(performanceTemplateQuestions.templateId, templateId))
      .orderBy(performanceTemplateQuestions.order)
      .execute();

    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await this.db
          .update(performanceTemplateQuestions)
          .set({ order: i })
          .where(
            and(
              eq(performanceTemplateQuestions.templateId, templateId),
              eq(performanceTemplateQuestions.questionId, remaining[i].id),
            ),
          )
          .execute();
      }
    }

    await this.auditService.logAction({
      action: 'remove_question',
      entity: 'performance_review_template',
      entityId: templateId,
      userId: user.id,
      details: `Removed question ${questionId} from template ${templateId}`,
    });

    await this.bump(user.companyId);
    return { success: true };
  }

  async seedDefaultTemplate(companyId: string) {
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
      .returning()
      .execute();

    if (!template) return;

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

    if (questionIds.length) {
      const payload = questionIds.map((qid, i) => ({
        templateId: template.id,
        questionId: qid,
        order: i,
        isMandatory: true,
      }));
      await this.db
        .insert(performanceTemplateQuestions)
        .values(payload)
        .execute();
    }

    await this.bump(companyId);
  }

  lookupQuestionIds = async (
    dbConn: db,
    questions: string[],
    companyId?: string,
  ) => {
    const rows = await dbConn.query.performanceReviewQuestions.findMany({
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
