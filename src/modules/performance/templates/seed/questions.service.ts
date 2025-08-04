import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq, or, and } from 'drizzle-orm';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { performanceReviewQuestions } from '../schema/performance-review-questions.schema';
import { UpdateQuestionsDto } from './dto/update-questions.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { performanceCompetencies } from '../schema/performance-competencies.schema';
import { questions } from './defaults';

@Injectable()
export class PerformanceReviewQuestionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(user: User, dto: CreateQuestionsDto) {
    const { companyId, id: userId } = user;
    const [created] = await this.db
      .insert(performanceReviewQuestions)
      .values({
        companyId,
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
      userId: userId,
      details: `Created question: ${created.question}`,
    });

    return created;
  }

  async getAll(companyId: string) {
    return this.db
      .select()
      .from(performanceReviewQuestions)
      .where(
        or(
          eq(performanceReviewQuestions.companyId, companyId),
          eq(performanceReviewQuestions.isGlobal, true),
        ),
      );
  }

  async getById(id: string, companyId: string) {
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

    if (!question) throw new NotFoundException('Question not found');
    if (question.companyId !== companyId)
      throw new ForbiddenException(
        'Cannot delete global or other company’s question',
      );

    return question;
  }

  async update(id: string, user: User, dto: UpdateQuestionsDto) {
    const { companyId, id: userId } = user;
    // Make sure it's company-owned
    await this.getById(id, companyId);

    await this.db
      .update(performanceReviewQuestions)
      .set({ ...dto })
      .where(eq(performanceReviewQuestions.id, id));

    // Log the update action
    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_review_question',
      entityId: id,
      userId: userId,
      details: `Updated question: ${dto.question}`,
      changes: {
        question: dto.question,
        type: dto.type,
        competencyId: dto.competencyId,
        isMandatory: dto.isMandatory,
        allowNotes: dto.allowNotes,
      },
    });

    return { message: 'Updated successfully' };
  }

  async delete(id: string, user: User) {
    const { companyId, id: userId } = user;
    const question = await this.getById(id, companyId);

    await this.db
      .delete(performanceReviewQuestions)
      .where(eq(performanceReviewQuestions.id, id));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_review_question',
      entityId: id,
      userId: userId,
      details: `Deleted question: ${question.question}`,
    });

    return { message: 'Deleted successfully' };
  }

  async seedGlobalReviewQuestions() {
    for (const entry of questions) {
      // Find the global competency by name
      const [competency] = await this.db
        .select()
        .from(performanceCompetencies)
        .where(
          and(
            eq(performanceCompetencies.name, entry.competency),
            eq(performanceCompetencies.isGlobal, true),
          ),
        );

      if (!competency) {
        console.warn(`Competency not found: ${entry.competency}`);
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

    return { message: 'Global questions seeded.' };
  }
}
