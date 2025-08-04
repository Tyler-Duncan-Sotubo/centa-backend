import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq, inArray, count as drizzleCount } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { feedbackQuestions } from '../schema/performance-feedback-questions.schema';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';

@Injectable()
export class FeedbackQuestionService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

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
      .returning();

    return question;
  }

  async findAll() {
    return this.db.select().from(feedbackQuestions);
  }

  async findByType(type: string) {
    return this.db
      .select()
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.type, type));
  }

  async findOne(id: string) {
    const [question] = await this.db
      .select()
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.id, id));

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async update(id: string, dto: UpdateFeedbackQuestionDto) {
    const [updated] = await this.db
      .update(feedbackQuestions)
      .set(dto)
      .where(eq(feedbackQuestions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Question not found');
    }

    return updated;
  }

  async delete(id: string) {
    // 1. Check if the question exists
    const [existing] = await this.db
      .select()
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.id, id));

    if (!existing) {
      throw new NotFoundException('Question not found');
    }

    // 2. Count how many questions remain for this type
    const countRes = await this.db
      .select({ count: drizzleCount() })
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.type, existing.type));

    const remainingCount = Number(countRes[0]?.count ?? 0);

    if (remainingCount <= 1) {
      throw new BadRequestException(
        `Cannot delete the last question of type "${existing.type}"`,
      );
    }

    // 3. Delete the question
    await this.db.delete(feedbackQuestions).where(eq(feedbackQuestions.id, id));

    // 4. Reorder remaining questions of the same type
    const remaining = await this.db
      .select()
      .from(feedbackQuestions)
      .where(eq(feedbackQuestions.type, existing.type))
      .orderBy(feedbackQuestions.order);

    for (let i = 0; i < remaining.length; i++) {
      const q = remaining[i];
      if (q.order !== i) {
        await this.db
          .update(feedbackQuestions)
          .set({ order: i })
          .where(eq(feedbackQuestions.id, q.id));
      }
    }

    return { message: 'Question deleted and reordered' };
  }

  async reorderQuestionsByType(
    type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager',
    newOrder: { id: string; order: number }[],
  ) {
    const ids = newOrder.map((q) => q.id);

    // Validate all IDs exist and belong to the same type
    const existing = await this.db
      .select({ id: feedbackQuestions.id })
      .from(feedbackQuestions)
      .where(inArray(feedbackQuestions.id, ids));

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
        .where(eq(feedbackQuestions.id, id));
    }

    return { message: `Order updated for ${newOrder.length} questions.` };
  }

  async seedFeedbackQuestions(companyId: string) {
    const defaults = [
      // Self Feedback
      {
        type: 'self',
        questions: [
          'What are some things I do well?',
          'How can I improve?',
          'How well does the company recognize my values?',
        ],
      },
      // Peer Feedback
      {
        type: 'peer',
        questions: [
          'Where does this person perform well?',
          'How can this person improve?',
          'Do you have additional feedback?',
        ],
      },
      // Manager to Employee
      {
        type: 'manager_to_employee',
        questions: [
          'What are the employee’s strengths?',
          'What areas need improvement?',
          'Is the employee meeting expectations?',
        ],
      },
      // Employee to Manager
      {
        type: 'employee_to_manager',
        questions: [
          'How does the manager support your work?',
          'Where can the manager improve?',
          'Do you feel heard and supported?',
        ],
      },
    ];

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
  }
}
