import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, eq, isNull, or } from 'drizzle-orm';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { performanceReviewQuestions } from '../schema/performance-review-questions.schema';
import { UpdateQuestionsDto } from './dto/update-questions.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { performanceCompetencies } from '../schema/performance-competencies.schema';
import { questions as defaultQuestions } from './defaults';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PerformanceReviewQuestionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(PerformanceReviewQuestionService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `prq:${companyId}:list`;
  }
  private oneKey(companyId: string, id: string) {
    return `prq:${companyId}:one:${id}`;
  }

  private async burst(opts: { companyId?: string; id?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) {
      jobs.push(this.cache.del(this.listKey(opts.companyId)));
      if (opts.id)
        jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
    }
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'prq:cache:burst');
  }

  // ---------- helpers ----------
  /** Ensures the question exists and is owned by the company (NOT global). */
  private async ensureCompanyOwned(id: string, companyId: string) {
    const [row] = await this.db
      .select()
      .from(performanceReviewQuestions)
      .where(
        and(
          eq(performanceReviewQuestions.id, id),
          eq(performanceReviewQuestions.companyId, companyId),
          // explicitly not global
          eq(performanceReviewQuestions.isGlobal, false),
        ),
      );

    if (!row) {
      this.logger.warn(
        { id, companyId },
        'prq:ensureCompanyOwned:not-owned-or-missing',
      );
      throw new ForbiddenException('Only company questions can be modified');
    }
    return row;
  }

  // ---------- mutations ----------
  async create(user: User, dto: CreateQuestionsDto) {
    this.logger.info(
      { userId: user.id, companyId: user.companyId },
      'prq:create:start',
    );

    const [created] = await this.db
      .insert(performanceReviewQuestions)
      .values({
        companyId: user.companyId,
        question: dto.question,
        type: dto.type,
        competencyId: dto.competencyId,
        isMandatory: dto.isMandatory ?? false,
        allowNotes: dto.allowNotes ?? false,
        isActive: true,
        isGlobal: false,
        createdAt: new Date(),
      })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_review_question',
      entityId: created.id,
      userId: user.id,
      details: `Created question: ${created.question}`,
    });

    await this.burst({ companyId: user.companyId, id: created.id });
    this.logger.info({ id: created.id }, 'prq:create:done');
    return created;
  }

  async update(id: string, user: User, dto: UpdateQuestionsDto) {
    this.logger.info({ id, userId: user.id }, 'prq:update:start');

    await this.ensureCompanyOwned(id, user.companyId);

    const [updated] = await this.db
      .update(performanceReviewQuestions)
      .set({ ...dto })
      .where(eq(performanceReviewQuestions.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_review_question',
      entityId: id,
      userId: user.id,
      details: `Updated question: ${dto.question ?? updated.question}`,
      changes: {
        question: dto.question,
        type: dto.type,
        competencyId: dto.competencyId,
        isMandatory: dto.isMandatory,
        allowNotes: dto.allowNotes,
      },
    });

    await this.burst({ companyId: user.companyId, id });
    this.logger.info({ id }, 'prq:update:done');
    return updated;
  }

  async delete(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'prq:delete:start');

    const question = await this.ensureCompanyOwned(id, user.companyId);

    await this.db
      .delete(performanceReviewQuestions)
      .where(eq(performanceReviewQuestions.id, id));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_review_question',
      entityId: id,
      userId: user.id,
      details: `Deleted question: ${question.question}`,
    });

    await this.burst({ companyId: user.companyId, id });
    this.logger.info({ id }, 'prq:delete:done');
    return { message: 'Deleted successfully' };
  }

  async seedGlobalReviewQuestions() {
    this.logger.info({}, 'prq:seedGlobals:start');

    for (const entry of defaultQuestions) {
      const [competency] = await this.db
        .select()
        .from(performanceCompetencies)
        .where(
          and(
            eq(performanceCompetencies.name, entry.competency),
            eq(performanceCompetencies.isGlobal, true),
            isNull(performanceCompetencies.companyId),
          ),
        );

      if (!competency) {
        this.logger.warn(
          { competency: entry.competency },
          'prq:seedGlobals:competency-missing',
        );
        continue;
      }

      for (const q of entry.questions) {
        const existing = await this.db
          .select()
          .from(performanceReviewQuestions)
          .where(
            and(
              eq(performanceReviewQuestions.question, q.question),
              eq(performanceReviewQuestions.competencyId, competency.id),
              eq(performanceReviewQuestions.isGlobal, true),
            ),
          );

        if (existing.length === 0) {
          await this.db.insert(performanceReviewQuestions).values({
            question: q.question,
            type: q.type,
            competencyId: competency.id,
            isMandatory: q.isMandatory ?? false,
            allowNotes: q.allowNotes ?? false,
            isActive: true,
            isGlobal: true,
            companyId: null,
            createdAt: new Date(),
          });
        }
      }
    }

    // global list is per-company cached; nothing to burst here
    this.logger.info({}, 'prq:seedGlobals:done');
    return { message: 'Global questions seeded.' };
  }

  // ---------- queries (cached) ----------
  async getAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'prq:getAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(performanceReviewQuestions)
        .where(
          or(
            eq(performanceReviewQuestions.companyId, companyId),
            eq(performanceReviewQuestions.isGlobal, true),
          ),
        );

      this.logger.debug(
        { companyId, count: rows.length },
        'prq:getAll:db:done',
      );
      return rows;
    });
  }

  async getById(id: string, companyId: string) {
    const key = this.oneKey(companyId, id);
    this.logger.debug({ id, companyId, key }, 'prq:getById:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [question] = await this.db
        .select()
        .from(performanceReviewQuestions)
        .where(
          and(
            eq(performanceReviewQuestions.id, id),
            or(
              eq(performanceReviewQuestions.companyId, companyId),
              eq(performanceReviewQuestions.isGlobal, true),
            ),
          ),
        );

      if (!question) {
        this.logger.warn({ id, companyId }, 'prq:getById:not-found');
        throw new NotFoundException('Question not found');
      }

      // NOTE: allow reading global; only block modification via ensureCompanyOwned()
      this.logger.debug({ id }, 'prq:getById:db:done');
      return question;
    });
  }
}
