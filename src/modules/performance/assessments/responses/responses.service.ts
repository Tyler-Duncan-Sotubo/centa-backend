import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
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

@Injectable()
export class AssessmentResponsesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async getResponsesForAssessment(assessmentId: string) {
    // Step 1: Get the template ID for this assessment
    const [assessment] = await this.db
      .select({ templateId: performanceAssessments.templateId })
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (!assessment) {
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
      .orderBy(performanceTemplateQuestions.order);

    return results;
  }

  async saveResponse(assessmentId: string, dto: SaveResponseDto, user: User) {
    // Remove existing response if any
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

    return { success: true };
  }

  async bulkSaveResponses(
    assessmentId: string,
    dto: BulkSaveResponsesDto,
    user: User,
  ) {
    // Optional: delete all existing for that assessment and replace
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

    // Audit log
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

    return { success: true, count: payload.length };
  }
}
