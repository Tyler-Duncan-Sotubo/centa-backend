import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { eq, inArray, asc, sql, and, count as drizzleCount } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
import { feedbackQuestions } from '../schema/performance-feedback-questions.schema';
import { CacheService } from 'src/common/cache/cache.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class FeedbackQuestionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FeedbackQuestionService.name);
  }

  // -------- cache keys (no TTL) --------
  private listKey(companyId: string) {
    return `fbq:${companyId}:all`;
  }
  private typeKey(companyId: string, type: string) {
    return `fbq:${companyId}:type:${type}`;
  }
  private oneKey(companyId: string, id: string) {
    return `fbq:${companyId}:id:${id}`;
  }
  private async burst(
    companyId: string,
    ids: string[] = [],
    types: string[] = [],
  ) {
    const jobs: Promise<any>[] = [this.cache.del(this.listKey(companyId))];
    types.forEach((t) => jobs.push(this.cache.del(this.typeKey(companyId, t))));
    ids.forEach((id) => jobs.push(this.cache.del(this.oneKey(companyId, id))));
    await Promise.allSettled(jobs);
    this.logger.debug(
      { companyId, ids, types },
      'feedback-questions:cache:burst',
    );
  }

  // -------- CRUD --------

  async create(dto: CreateFeedbackQuestionDto, user: User) {
    const companyId = user.companyId;

    // enforce uniqueness per company/type/question
    const [dup] = await this.db
      .select({ id: feedbackQuestions.id })
      .from(feedbackQuestions)
      .where(
        and(
          eq(feedbackQuestions.companyId, companyId),
          eq(feedbackQuestions.type, dto.type),
          eq(feedbackQuestions.question, dto.question.trim()),
        ),
      )
      .limit(1);

    if (dup) {
      throw new BadRequestException(
        'A question with the same text already exists for this type.',
      );
    }

    // auto-assign order if missing (append to end)
    let order = dto.order;
    if (order == null) {
      const [cnt] = await this.db
        .select({ c: drizzleCount() })
        .from(feedbackQuestions)
        .where(
          and(
            eq(feedbackQuestions.companyId, companyId),
            eq(feedbackQuestions.type, dto.type),
          ),
        );
      order = Number(cnt?.c ?? 0);
    }

    const [question] = await this.db
      .insert(feedbackQuestions)
      .values({
        companyId,
        question: dto.question.trim(),
        type: dto.type,
        order,
        inputType: dto.inputType,
      })
      .returning();

    await this.burst(companyId, [question.id], [dto.type]);
    return question;
  }

  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(feedbackQuestions)
        .where(eq(feedbackQuestions.companyId, companyId))
        .orderBy(asc(feedbackQuestions.type), asc(feedbackQuestions.order));
      return rows;
    });
  }

  async findByType(companyId: string, type: string) {
    const key = this.typeKey(companyId, type);
    return this.cache.getOrSetCache(key, async () => {
      return this.db
        .select()
        .from(feedbackQuestions)
        .where(
          and(
            eq(feedbackQuestions.companyId, companyId),
            eq(feedbackQuestions.type, type),
          ),
        )
        .orderBy(asc(feedbackQuestions.order));
    });
  }

  async findOne(companyId: string, id: string) {
    const key = this.oneKey(companyId, id);
    return this.cache.getOrSetCache(key, async () => {
      const [question] = await this.db
        .select()
        .from(feedbackQuestions)
        .where(
          and(
            eq(feedbackQuestions.companyId, companyId),
            eq(feedbackQuestions.id, id),
          ),
        );

      if (!question) throw new NotFoundException('Question not found');
      return question;
    });
  }

  async update(companyId: string, id: string, dto: UpdateFeedbackQuestionDto) {
    // ensure exists & scoped
    const existing = await this.findOne(companyId, id);

    // optional uniqueness check when changing question text/type
    if (dto.question || dto.type) {
      const newType = dto.type ?? existing.type;
      const newText = (dto.question ?? existing.question).trim();

      const [dup] = await this.db
        .select({ id: feedbackQuestions.id })
        .from(feedbackQuestions)
        .where(
          and(
            eq(feedbackQuestions.companyId, companyId),
            eq(feedbackQuestions.type, newType),
            eq(feedbackQuestions.question, newText),
            // not self
            sql`NOT (${eq(feedbackQuestions.id, id)})`, // workaround for "not self"
          ) as any,
        )
        .limit(1);

      if (dup) {
        throw new BadRequestException(
          'A question with the same text already exists for this type.',
        );
      }
    }

    const [updated] = await this.db
      .update(feedbackQuestions)
      .set({
        question: dto.question?.trim() ?? existing.question,
        type: dto.type ?? existing.type,
        order: dto.order ?? existing.order,
        inputType: dto.inputType ?? existing.inputType,
      })
      .where(
        and(
          eq(feedbackQuestions.companyId, companyId),
          eq(feedbackQuestions.id, id),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('Question not found');

    // if type changed, burst both old & new type caches
    const typesToBurst = Array.from(new Set([existing.type, updated.type]));
    await this.burst(companyId, [id], typesToBurst);
    return updated;
  }

  async delete(companyId: string, id: string) {
    // 1) fetch & scope
    const [existing] = await this.db
      .select()
      .from(feedbackQuestions)
      .where(
        and(
          eq(feedbackQuestions.companyId, companyId),
          eq(feedbackQuestions.id, id),
        ),
      );

    if (!existing) throw new NotFoundException('Question not found');

    // 2) count remaining in same company+type
    const [cnt] = await this.db
      .select({ c: drizzleCount() })
      .from(feedbackQuestions)
      .where(
        and(
          eq(feedbackQuestions.companyId, companyId),
          eq(feedbackQuestions.type, existing.type),
        ),
      );

    const remainingCount = Number(cnt?.c ?? 0);
    if (remainingCount <= 1) {
      throw new BadRequestException(
        `Cannot delete the last question of type "${existing.type}"`,
      );
    }

    // 3) transaction: delete + reorder contiguous
    await this.db.transaction(async (trx) => {
      await trx.delete(feedbackQuestions).where(eq(feedbackQuestions.id, id));

      const remaining = await trx
        .select()
        .from(feedbackQuestions)
        .where(
          and(
            eq(feedbackQuestions.companyId, companyId),
            eq(feedbackQuestions.type, existing.type),
          ),
        )
        .orderBy(asc(feedbackQuestions.order));

      for (let i = 0; i < remaining.length; i++) {
        const q = remaining[i];
        if (q.order !== i) {
          await trx
            .update(feedbackQuestions)
            .set({ order: i })
            .where(eq(feedbackQuestions.id, q.id));
        }
      }
    });

    await this.burst(companyId, [id], [existing.type]);
    return { message: 'Question deleted and reordered' };
  }

  async reorderQuestionsByType(
    companyId: string,
    type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager',
    newOrder: { id: string; order: number }[],
  ) {
    const ids = newOrder.map((q) => q.id);

    // Validate IDs all exist in this company & type
    const existing = await this.db
      .select({ id: feedbackQuestions.id })
      .from(feedbackQuestions)
      .where(
        and(
          eq(feedbackQuestions.companyId, companyId),
          eq(feedbackQuestions.type, type),
          inArray(feedbackQuestions.id, ids),
        ),
      );

    const existingIds = new Set(existing.map((e) => e.id));
    const invalidIds = ids.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid question IDs for type '${type}': ${invalidIds.join(', ')}`,
      );
    }

    // Reorder atomically
    await this.db.transaction(async (trx) => {
      for (const { id, order } of newOrder) {
        await trx
          .update(feedbackQuestions)
          .set({ order })
          .where(
            and(
              eq(feedbackQuestions.companyId, companyId),
              eq(feedbackQuestions.id, id),
            ),
          );
      }
    });

    await this.burst(companyId, ids, [type]);
    return { message: `Order updated for ${newOrder.length} questions.` };
  }

  async seedFeedbackQuestions(companyId: string) {
    const defaults = [
      {
        type: 'self',
        questions: [
          'What are some things I do well?',
          'How can I improve?',
          'How well does the company recognize my values?',
        ],
      },
      {
        type: 'peer',
        questions: [
          'Where does this person perform well?',
          'How can this person improve?',
          'Do you have additional feedback?',
        ],
      },
      {
        type: 'manager_to_employee',
        questions: [
          'What are the employee’s strengths?',
          'What areas need improvement?',
          'Is the employee meeting expectations?',
        ],
      },
      {
        type: 'employee_to_manager',
        questions: [
          'How does the manager support your work?',
          'Where can the manager improve?',
          'Do you feel heard and supported?',
        ],
      },
    ] as const;

    // Insert only if none exist for company
    const [cnt] = await this.db
      .select({ c: drizzleCount() })
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.companyId, companyId));

    if (Number(cnt?.c ?? 0) > 0) {
      throw new BadRequestException(
        'Feedback questions already seeded for this company.',
      );
    }

    const insertData = defaults.flatMap(({ type, questions }) =>
      questions.map((question, index) => ({
        companyId,
        question,
        type,
        order: index,
        isActive: true,
      })),
    );

    await this.db.insert(feedbackQuestions).values(insertData);
    await this.burst(
      companyId,
      [],
      Array.from(new Set(insertData.map((i) => i.type))),
    );
    return { message: 'Seeded feedback questions' };
  }
}
