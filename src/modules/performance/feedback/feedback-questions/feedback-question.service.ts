import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, inArray, asc, count as drizzleCount, and } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { feedbackQuestions } from '../schema/performance-feedback-questions.schema';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class FeedbackQuestionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [`company:${companyId}:feedback-questions`];
  }
  private async invalidate(companyId: string) {
    // Version-bump is enough even if Redis tags aren’t available
    await this.cache.bumpCompanyVersion(companyId);
    // If you wire native Redis tagging, you can also:
    // await this.cache.invalidateTags(this.tags(companyId));
  }

  async create(dto: CreateFeedbackQuestionDto, user: User) {
    const [question] = await this.db
      .insert(feedbackQuestions)
      .values({
        companyId: user.companyId,
        question: dto.question,
        type: dto.type,
        order: dto.order,
        inputType: dto.inputType,
      })
      .returning()
      .execute();

    await this.invalidate(user.companyId);
    return question;
  }

  /** Get all questions for a company (cached) */
  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['feedback-questions', 'all'],
      async () =>
        this.db
          .select()
          .from(feedbackQuestions)
          .where(eq(feedbackQuestions.companyId, companyId))
          .orderBy(asc(feedbackQuestions.type), asc(feedbackQuestions.order))
          .execute(),
      { tags: this.tags(companyId) },
    );
  }

  /** Get questions by type for a company (cached) */
  async findByType(companyId: string, type: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['feedback-questions', 'type', type],
      async () =>
        this.db
          .select()
          .from(feedbackQuestions)
          .where(
            and(
              eq(feedbackQuestions.companyId, companyId),
              eq(feedbackQuestions.type, type),
            ),
          )
          .orderBy(asc(feedbackQuestions.order)),
      { tags: this.tags(companyId) },
    );
  }

  /** Get one question by id (cached) */
  async findOne(companyId: string, id: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['feedback-questions', 'one', id],
      async () => {
        const [question] = await this.db
          .select()
          .from(feedbackQuestions)
          .where(
            eq(feedbackQuestions.id, id) &&
              eq(feedbackQuestions.companyId, companyId),
          )
          .execute();

        if (!question) {
          throw new NotFoundException('Question not found');
        }
        return question;
      },
      { tags: this.tags(companyId) },
    );
  }

  async update(companyId: string, id: string, dto: UpdateFeedbackQuestionDto) {
    // Ensure it exists & belongs to company
    await this.findOne(companyId, id);

    const [updated] = await this.db
      .update(feedbackQuestions)
      .set(dto)
      .where(
        eq(feedbackQuestions.id, id) &&
          eq(feedbackQuestions.companyId, companyId),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Question not found');
    }

    await this.invalidate(companyId);
    return updated;
  }

  async delete(companyId: string, id: string) {
    // 1) Check it exists and belongs to the company
    const [existing] = await this.db
      .select()
      .from(feedbackQuestions)
      .where(
        eq(feedbackQuestions.id, id) &&
          eq(feedbackQuestions.companyId, companyId),
      )
      .execute();

    if (!existing) {
      throw new NotFoundException('Question not found');
    }

    // 2) Count how many questions remain for this type (in this company)
    const countRes = await this.db
      .select({ count: drizzleCount() })
      .from(feedbackQuestions)
      .where(
        eq(feedbackQuestions.companyId, companyId) &&
          eq(feedbackQuestions.type, existing.type),
      )
      .execute();

    const remainingCount = Number(countRes[0]?.count ?? 0);
    if (remainingCount <= 1) {
      throw new BadRequestException(
        `Cannot delete the last question of type "${existing.type}"`,
      );
    }

    // 3) Delete the question
    await this.db
      .delete(feedbackQuestions)
      .where(
        eq(feedbackQuestions.id, id) &&
          eq(feedbackQuestions.companyId, companyId),
      )
      .execute();

    // 4) Reorder remaining questions of the same type within the company
    const remaining = await this.db
      .select()
      .from(feedbackQuestions)
      .where(
        eq(feedbackQuestions.companyId, companyId) &&
          eq(feedbackQuestions.type, existing.type),
      )
      .orderBy(asc(feedbackQuestions.order))
      .execute();

    for (let i = 0; i < remaining.length; i++) {
      const q = remaining[i];
      if (q.order !== i) {
        await this.db
          .update(feedbackQuestions)
          .set({ order: i })
          .where(eq(feedbackQuestions.id, q.id))
          .execute();
      }
    }

    await this.invalidate(companyId);
    return { message: 'Question deleted and reordered' };
  }

  async reorderQuestionsByType(
    companyId: string,
    type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager',
    newOrder: { id: string; order: number }[],
  ) {
    const ids = newOrder.map((q) => q.id);

    // Validate all IDs exist, belong to the company, and match the type
    const existing = await this.db
      .select({ id: feedbackQuestions.id })
      .from(feedbackQuestions)
      .where(
        inArray(feedbackQuestions.id, ids) &&
          eq(feedbackQuestions.companyId, companyId) &&
          eq(feedbackQuestions.type, type),
      )
      .execute();

    const existingIds = new Set(existing.map((e) => e.id));
    const invalidIds = ids.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid question IDs for type '${type}': ${invalidIds.join(', ')}`,
      );
    }

    // Update each with new order
    for (const { id, order } of newOrder) {
      await this.db
        .update(feedbackQuestions)
        .set({ order })
        .where(
          eq(feedbackQuestions.id, id) &&
            eq(feedbackQuestions.companyId, companyId),
        )
        .execute();
    }

    await this.invalidate(companyId);
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

    const insertData = defaults.flatMap(({ type, questions }) =>
      questions.map((question, index) => ({
        companyId,
        question,
        type,
        order: index,
        isActive: true,
      })),
    );

    await this.db.insert(feedbackQuestions).values(insertData).execute();
    await this.invalidate(companyId);
  }
}
