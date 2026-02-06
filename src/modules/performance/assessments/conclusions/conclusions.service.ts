import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { CreateConclusionDto } from './dto/create-conclusion.dto';
import { UpdateConclusionDto } from './dto/update-conclusion.dto';
import { assessmentConclusions } from '../schema/performance-assessment-conclusions.schema';
import { performanceAssessments } from '../schema/performance-assessments.schema';
import { companyRoles, users } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';

type ReviewStatus = 'draft' | 'pending_hr' | 'needs_changes' | 'approved';

@Injectable()
export class AssessmentConclusionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
  }

  async createConclusion(
    assessmentId: string,
    dto: CreateConclusionDto,
    authorId: string,
  ) {
    const assessment = await this.getAssessmentOrThrow(assessmentId);

    const isReviewer = assessment.reviewerId === authorId;
    const isHR = await this.isHR(authorId);

    if (!isReviewer && !isHR) {
      throw new ForbiddenException('Not authorized to submit this conclusion');
    }

    const [existing] = await this.db
      .select({ assessmentId: assessmentConclusions.assessmentId })
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .limit(1);

    if (existing) throw new BadRequestException('Conclusion already exists');

    const now = new Date();

    const [created] = await this.db
      .insert(assessmentConclusions)
      .values({
        assessmentId,
        ...dto,
        reviewStatus: 'draft' as ReviewStatus,
        createdAt: now,
        updatedAt: now,
      } as any)
      .returning();

    await this.invalidate(assessment.companyId);
    return created;
  }

  /**
   * Update body fields:
   * - LM can edit when: draft OR needs_changes
   * - HR can edit when: pending_hr (and optionally needs_changes if you want)
   * - locked when: approved
   */
  async updateConclusion(
    assessmentId: string,
    dto: UpdateConclusionDto,
    authorId: string,
  ) {
    const assessment = await this.getAssessmentOrThrow(assessmentId);
    const conclusion = await this.getConclusionOrThrow(assessmentId);

    if (conclusion.reviewStatus === 'approved') {
      throw new BadRequestException(
        'Conclusion is approved and cannot be edited',
      );
    }

    const isReviewer = assessment.reviewerId === authorId;
    const isHR = await this.isHR(authorId);

    if (
      conclusion.reviewStatus === 'draft' ||
      conclusion.reviewStatus === 'needs_changes'
    ) {
      if (!isReviewer) {
        // keep strict: only LM edits in these stages
        throw new ForbiddenException(
          'Only the line manager can edit at this stage',
        );
      }
    } else if (conclusion.reviewStatus === 'pending_hr') {
      if (!isHR) {
        throw new ForbiddenException('Only HR can edit at this stage');
      }
    } else {
      throw new BadRequestException('Invalid review status');
    }

    const [updated] = await this.db
      .update(assessmentConclusions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning();

    await this.invalidate(assessment.companyId);
    return updated;
  }

  /**
   * LM -> HR: submit for HR review
   * allowed when: draft OR needs_changes
   */
  async submitConclusionToHR(assessmentId: string, authorId: string) {
    const assessment = await this.getAssessmentOrThrow(assessmentId);
    const conclusion = await this.getConclusionOrThrow(assessmentId);

    if (assessment.reviewerId !== authorId) {
      throw new ForbiddenException('Only the line manager can submit to HR');
    }

    if (!['draft', 'needs_changes'].includes(conclusion.reviewStatus)) {
      throw new BadRequestException('Conclusion is not ready to submit to HR');
    }

    const [updated] = await this.db
      .update(assessmentConclusions)
      .set({
        reviewStatus: 'pending_hr' as ReviewStatus,
        submittedToHrAt: new Date(),
        submittedToHrBy: authorId,
        // clear any old change request note so UI doesn’t show stale data
        changesRequestedAt: null,
        changesRequestedBy: null,
        changesRequestNote: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning();

    // (Optional) keep your existing behavior: assessment becomes submitted when LM sends to HR
    await this.db
      .update(performanceAssessments)
      .set({ status: 'submitted', submittedAt: new Date() })
      .where(eq(performanceAssessments.id, assessmentId));

    await this.invalidate(assessment.companyId);
    return updated;
  }

  /**
   * HR -> LM: request changes (send back)
   * allowed when: pending_hr
   */
  async requestChanges(assessmentId: string, note: string, authorId: string) {
    if (!note?.trim()) throw new BadRequestException('A note is required');

    const assessment = await this.getAssessmentOrThrow(assessmentId);
    const conclusion = await this.getConclusionOrThrow(assessmentId);

    const isHR = await this.isHR(authorId);
    if (!isHR) throw new ForbiddenException('Only HR can request changes');

    if (conclusion.reviewStatus !== 'pending_hr') {
      throw new BadRequestException('Conclusion is not pending HR review');
    }

    const [updated] = await this.db
      .update(assessmentConclusions)
      .set({
        reviewStatus: 'needs_changes' as ReviewStatus,
        changesRequestedAt: new Date(),
        changesRequestedBy: authorId,
        changesRequestNote: note.trim(),
        updatedAt: new Date(),
      } as any)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning();

    await this.invalidate(assessment.companyId);
    return updated;
  }

  /**
   * HR final approve (locks)
   * allowed when: pending_hr
   */
  async approveConclusion(assessmentId: string, authorId: string) {
    const assessment = await this.getAssessmentOrThrow(assessmentId);
    const conclusion = await this.getConclusionOrThrow(assessmentId);

    const isHR = await this.isHR(authorId);
    if (!isHR) throw new ForbiddenException('Only HR can approve');

    if (conclusion.reviewStatus !== 'pending_hr') {
      throw new BadRequestException('Conclusion is not pending HR review');
    }

    const [approved] = await this.db
      .update(assessmentConclusions)
      .set({
        reviewStatus: 'approved' as ReviewStatus,
        hrApprovedAt: new Date(),
        hrApprovedBy: authorId,
        updatedAt: new Date(),
      } as any)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning();

    await this.invalidate(assessment.companyId);
    return approved;
  }

  /** Cached + versioned fetch. */
  async getConclusionByAssessment(assessmentId: string) {
    const assessment = await this.getAssessmentOrThrow(assessmentId);

    return this.cache.getOrSetVersioned(
      assessment.companyId,
      ['assessments', 'conclusion', assessmentId],
      async () => {
        const [conclusion] = await this.db
          .select()
          .from(assessmentConclusions)
          .where(eq(assessmentConclusions.assessmentId, assessmentId))
          .limit(1);

        if (!conclusion) throw new NotFoundException('Conclusion not found');
        return conclusion;
      },
    );
  }

  // ------------------------
  // Internals
  // ------------------------

  private async getAssessmentOrThrow(assessmentId: string) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment as any;
  }

  private async getConclusionOrThrow(assessmentId: string) {
    const [conclusion] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .limit(1);

    if (!conclusion) throw new NotFoundException('Conclusion not found');
    return conclusion as any;
  }

  private async isHR(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ roleName: companyRoles.name })
      .from(users)
      .leftJoin(companyRoles, eq(companyRoles.id, users.companyRoleId))
      .where(eq(users.id, userId))
      .limit(1);

    const role = row?.roleName ?? '';
    return role === 'hr_manager' || role === 'admin' || role === 'super_admin';
  }
}
