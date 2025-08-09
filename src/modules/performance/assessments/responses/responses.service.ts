import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and } from 'drizzle-orm';
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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssessmentResponsesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(AssessmentResponsesService.name);
  }

  // ---------- cache keys ----------
  private listKey(assessmentId: string) {
    return `assessment:${assessmentId}:responses`;
  }
  private async burst(assessmentId: string) {
    await this.cache.del(this.listKey(assessmentId));
    this.logger.debug({ assessmentId }, 'cache:burst:assessment-responses');
  }

  // ---------- queries (cached) ----------
  async getResponsesForAssessment(assessmentId: string) {
    const key = this.listKey(assessmentId);
    this.logger.debug({ key, assessmentId }, 'responses:get:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      // Step 1: Get the template ID for this assessment
      const [assessment] = await this.db
        .select({ templateId: performanceAssessments.templateId })
        .from(performanceAssessments)
        .where(eq(performanceAssessments.id, assessmentId))
        .execute();

      if (!assessment) {
        this.logger.warn(
          { assessmentId },
          'responses:get:assessment:not-found',
        );
        throw new NotFoundException('Assessment not found');
      }

      // Step 2: Join response + question + template metadata
      const results = await this.db
        .select({
          questionId: performanceReviewQuestions.id,
          question: performanceReviewQuestions.question,
          type: performanceReviewQuestions.type,
          order: performanceTemplateQuestions.order,
          response: assessmentResponses.response,
        })
        .from(assessmentResponses)
        .innerJoin(
          performanceReviewQuestions,
          eq(assessmentResponses.questionId, performanceReviewQuestions.id),
        )
        .innerJoin(
          performanceTemplateQuestions,
          and(
            eq(
              performanceTemplateQuestions.questionId,
              performanceReviewQuestions.id,
            ),
            eq(performanceTemplateQuestions.templateId, assessment.templateId),
          ),
        )
        .where(eq(assessmentResponses.assessmentId, assessmentId))
        .orderBy(performanceTemplateQuestions.order)
        .execute();

      this.logger.debug(
        { assessmentId, count: results.length },
        'responses:get:db:done',
      );
      return results;
    });
  }

  // ---------- mutations ----------
  async saveResponse(assessmentId: string, dto: SaveResponseDto, user: User) {
    this.logger.info(
      { assessmentId, questionId: dto.questionId, userId: user.id },
      'responses:save:start',
    );

    // Remove existing response if any
    await this.db
      .delete(assessmentResponses)
      .where(
        and(
          eq(assessmentResponses.assessmentId, assessmentId),
          eq(assessmentResponses.questionId, dto.questionId),
        ),
      )
      .execute();

    await this.db
      .insert(assessmentResponses)
      .values({
        assessmentId,
        questionId: dto.questionId,
        response: dto.response,
        createdAt: new Date(),
      })
      .execute();

    // Audit log
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

    await this.burst(assessmentId);
    this.logger.info(
      { assessmentId, questionId: dto.questionId },
      'responses:save:done',
    );
    return { success: true };
  }

  async bulkSaveResponses(
    assessmentId: string,
    dto: BulkSaveResponsesDto,
    user: User,
  ) {
    this.logger.info(
      { assessmentId, count: dto.responses?.length ?? 0, userId: user.id },
      'responses:bulkSave:start',
    );

    await this.db.transaction(async (trx) => {
      await trx
        .delete(assessmentResponses)
        .where(eq(assessmentResponses.assessmentId, assessmentId))
        .execute();

      const payload = dto.responses.map((r) => ({
        assessmentId,
        questionId: r.questionId,
        response: r.response,
        createdAt: new Date(),
      }));

      if (payload.length) {
        await trx.insert(assessmentResponses).values(payload).execute();
      }
    });

    // Audit log
    await this.auditService.logAction({
      action: 'bulk_save',
      entity: 'assessment_response',
      entityId: assessmentId,
      userId: user.id,
      details: 'Bulk responses saved',
      changes: {
        assessmentId,
        responses: dto.responses,
      },
    });

    await this.burst(assessmentId);
    this.logger.info({ assessmentId }, 'responses:bulkSave:done');
    return { success: true, count: dto.responses.length };
  }
}
