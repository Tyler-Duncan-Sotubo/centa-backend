import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  performanceCompetencies,
  performanceReviewQuestions,
  performanceReviewTemplates,
  performanceTemplateQuestions,
} from '../schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PerformanceTemplatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(PerformanceTemplatesService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `prt:${companyId}:list`;
  }
  private oneKey(companyId: string, id: string) {
    return `prt:${companyId}:one:${id}`;
  }
  private qKey(companyId: string, id: string) {
    return `prt:${companyId}:one:${id}:questions`;
  }

  private async burst(opts: { companyId: string; templateId?: string }) {
    const jobs: Promise<unknown>[] = [];
    // list
    jobs.push(this.cache.del(this.listKey(opts.companyId)));
    // one + questions
    if (opts.templateId) {
      jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.templateId)));
      jobs.push(this.cache.del(this.qKey(opts.companyId, opts.templateId)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'templates:cache:burst');
  }

  // ---------- mutations ----------
  async create(user: User, dto: CreateTemplateDto) {
    this.logger.info(
      { companyId: user.companyId, dto },
      'templates:create:start',
    );

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

    await this.burst({ companyId, templateId: template.id });
    this.logger.info({ id: template.id }, 'templates:create:done');
    return template;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto, user: User) {
    this.logger.info(
      { id, userId: user.id, updateTemplateDto },
      'templates:update:start',
    );

    await this.getById(id, user.companyId); // ownership check

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

    await this.burst({ companyId: user.companyId, templateId: id });
    this.logger.info({ id }, 'templates:update:done');
    return updated;
  }

  async remove(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'templates:remove:start');

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

    await this.burst({ companyId: user.companyId, templateId: id });
    this.logger.info({ id }, 'templates:remove:done');
  }

  async assignQuestions(templateId: string, questionIds: string[], user: User) {
    this.logger.info(
      { templateId, userId: user.id, count: questionIds.length },
      'templates:assignQuestions:start',
    );

    // ensure template belongs to company
    await this.getById(templateId, user.companyId);

    await this.db
      .delete(performanceTemplateQuestions)
      .where(eq(performanceTemplateQuestions.templateId, templateId));

    const payload = questionIds.map((qid, index) => ({
      templateId,
      questionId: qid,
      order: index,
      isMandatory: true,
    }));

    if (payload.length) {
      await this.db.insert(performanceTemplateQuestions).values(payload);
    }

    await this.auditService.logAction({
      action: 'assign_questions',
      entity: 'performance_review_template',
      entityId: templateId,
      userId: user.id,
      details: `Assigned ${payload.length} questions to template ${templateId}`,
    });

    await this.burst({ companyId: user.companyId, templateId });
    this.logger.info({ templateId }, 'templates:assignQuestions:done');
    return { success: true, count: payload.length };
  }

  async removeQuestion(templateId: string, questionId: string, user: User) {
    this.logger.info(
      { templateId, questionId, userId: user.id },
      'templates:removeQuestion:start',
    );

    // ensure template belongs to company
    await this.getById(templateId, user.companyId);

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

    await this.burst({ companyId: user.companyId, templateId });
    this.logger.info(
      { templateId, questionId },
      'templates:removeQuestion:done',
    );
    return { success: true };
  }

  async seedDefaultTemplate(companyId: string) {
    this.logger.info({ companyId }, 'templates:seedDefault:start');

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

    if (!template) {
      this.logger.warn({ companyId }, 'templates:seedDefault:insert-failed');
      return;
    }

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

    if (payload.length) {
      await this.db.insert(performanceTemplateQuestions).values(payload);
    }

    await this.burst({ companyId, templateId: template.id });
    this.logger.info(
      { id: template.id, count: payload.length },
      'templates:seedDefault:done',
    );
  }

  // ---------- queries (cached) ----------
  findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'templates:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(performanceReviewTemplates)
        .where(eq(performanceReviewTemplates.companyId, companyId));

      this.logger.debug(
        { companyId, count: rows.length },
        'templates:findAll:db:done',
      );
      return rows;
    });
  }

  async findOne(id: string, companyId: string) {
    const keyTpl = this.oneKey(companyId, id);
    const keyQ = this.qKey(companyId, id);
    this.logger.debug(
      { id, companyId, keyTpl, keyQ },
      'templates:findOne:cache:get',
    );

    // Cache template and questions separately then compose (helps when questions change)
    const template = await this.cache.getOrSetCache(keyTpl, async () => {
      const [tpl] = await this.db
        .select()
        .from(performanceReviewTemplates)
        .where(
          and(
            eq(performanceReviewTemplates.id, id),
            eq(performanceReviewTemplates.companyId, companyId),
          ),
        );

      if (!tpl) {
        this.logger.warn({ id, companyId }, 'templates:findOne:not-found');
        throw new NotFoundException('Template not found');
      }
      return tpl;
    });

    const questions = await this.cache.getOrSetCache(keyQ, async () => {
      const rows = await this.db
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
          eq(
            performanceReviewQuestions.competencyId,
            performanceCompetencies.id,
          ),
        )
        .where(
          and(
            eq(performanceTemplateQuestions.templateId, id),
            eq(performanceReviewTemplates.companyId, companyId),
          ),
        )
        .orderBy(performanceTemplateQuestions.order);

      this.logger.debug(
        { id, count: rows.length },
        'templates:findOne:questions:db:done',
      );
      return rows;
    });

    return { ...template, questions };
  }

  async getById(id: string, companyId: string) {
    const key = this.oneKey(companyId, id);
    this.logger.debug({ id, companyId, key }, 'templates:getById:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [template] = await this.db
        .select()
        .from(performanceReviewTemplates)
        .where(
          and(
            eq(performanceReviewTemplates.id, id),
            eq(performanceReviewTemplates.companyId, companyId),
          ),
        );

      if (!template) {
        this.logger.warn({ id, companyId }, 'templates:getById:not-found');
        throw new NotFoundException('Template not found');
      }

      return template;
    });
  }

  // ---------- helpers ----------
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
      else this.logger.warn({ text }, 'templates:lookupQuestionIds:not-found');
    }
    return matchedIds;
  };
}
