import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, inArray } from 'drizzle-orm';
import { assessmentResponses } from '../schema/performance-assessment-responses.schema';
import {
  performanceReviewQuestions,
  performanceTemplateQuestions,
} from 'src/drizzle/schema';
import { performanceAssessments } from '../schema/performance-assessments.schema';
import { SaveResponseDto } from './dto/save-response.dto';
import { BulkSaveResponsesDto } from './dto/bulk-save-responses.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssessmentResponsesService {
  private readonly ttlSeconds = 10 * 60; // 10 minutes

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [`company:${companyId}:assessments`];
  }
  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // If your Redis sets are enabled, you could also call:
    // await this.cache.invalidateTags(this.tags(companyId));
  }

  /** Get all questions for an assessment’s template + the respondent’s answers (cached & versioned). */
  async getResponsesForAssessment(assessmentId: string) {
    // Fetch template + company for version scoping
    const [meta] = await this.db
      .select({
        templateId: performanceAssessments.templateId,
        companyId: performanceAssessments.companyId,
      })
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!meta) throw new NotFoundException('Assessment not found');

    return this.cache.getOrSetVersioned(
      meta.companyId,
      ['assessments', 'responses', assessmentId],
      async () => {
        // Build from template questions to include unanswered items
        const results = await this.db
          .select({
            questionId: performanceReviewQuestions.id,
            question: performanceReviewQuestions.question,
            type: performanceReviewQuestions.type,
            order: performanceTemplateQuestions.order,
            response: assessmentResponses.response, // may be null if unanswered
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
          .where(eq(performanceTemplateQuestions.templateId, meta.templateId))
          .orderBy(performanceTemplateQuestions.order);

        return results;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(meta.companyId) },
    );
  }

  async saveResponse(assessmentId: string, dto: SaveResponseDto, user: User) {
    // Validate assessment + question membership
    const [meta] = await this.db
      .select({
        templateId: performanceAssessments.templateId,
        companyId: performanceAssessments.companyId,
      })
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!meta) throw new NotFoundException('Assessment not found');

    const [belongs] = await this.db
      .select({ questionId: performanceTemplateQuestions.questionId })
      .from(performanceTemplateQuestions)
      .where(
        and(
          eq(performanceTemplateQuestions.templateId, meta.templateId),
          eq(performanceTemplateQuestions.questionId, dto.questionId),
        ),
      )
      .limit(1);

    if (!belongs) {
      throw new BadRequestException(
        'Question does not belong to assessment template',
      );
    }

    // Upsert (delete then insert to keep it simple/portable)
    await this.db
      .delete(assessmentResponses)
      .where(
        and(
          eq(assessmentResponses.assessmentId, assessmentId),
          eq(assessmentResponses.questionId, dto.questionId),
        ),
      );

    await this.db.insert(assessmentResponses).values({
      assessmentId,
      questionId: dto.questionId,
      response: dto.response,
      createdAt: new Date(),
    });

    await this.auditService.logAction({
      action: 'save',
      entity: 'assessment_response',
      entityId: dto.questionId,
      userId: user.id,
      details: 'Response saved',
      changes: {
        assessmentId,
        questionId: dto.questionId,
        response: dto.response,
      },
    });

    await this.invalidate(meta.companyId);

    return { success: true };
  }

  async bulkSaveResponses(
    assessmentId: string,
    dto: BulkSaveResponsesDto,
    user: User,
  ) {
    // Validate assessment + question membership
    const [meta] = await this.db
      .select({
        templateId: performanceAssessments.templateId,
        companyId: performanceAssessments.companyId,
      })
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!meta) throw new NotFoundException('Assessment not found');

    const ids = dto.responses.map((r) => r.questionId);
    if (ids.length === 0) {
      return { success: true, count: 0 };
    }

    const validQs = await this.db
      .select({ questionId: performanceTemplateQuestions.questionId })
      .from(performanceTemplateQuestions)
      .where(
        and(
          eq(performanceTemplateQuestions.templateId, meta.templateId),
          inArray(performanceTemplateQuestions.questionId, ids),
        ),
      );

    const validSet = new Set(validQs.map((q) => q.questionId));
    const invalid = ids.filter((id) => !validSet.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `Some questions do not belong to the assessment template: ${invalid.join(', ')}`,
      );
    }

    await this.db
      .delete(assessmentResponses)
      .where(eq(assessmentResponses.assessmentId, assessmentId));

    const payload = dto.responses.map((r) => ({
      assessmentId,
      questionId: r.questionId,
      response: r.response,
      createdAt: new Date(),
    }));

    await this.db.insert(assessmentResponses).values(payload);

    await this.auditService.logAction({
      action: 'bulk_save',
      entity: 'assessment_response',
      entityId: assessmentId,
      userId: user.id,
      details: 'Bulk responses saved',
      changes: {
        assessmentId,
        responses: payload,
      },
    });

    await this.invalidate(meta.companyId);

    return { success: true, count: payload.length };
  }
}
