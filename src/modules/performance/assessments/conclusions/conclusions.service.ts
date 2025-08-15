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

@Injectable()
export class AssessmentConclusionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [`company:${companyId}:assessments`];
  }
  private async invalidate(companyId: string) {
    await this.cache.bumpCompanyVersion(companyId);
    // Optionally, if native Redis sets are available this will clear tag sets:
    // await this.cache.invalidateTags(this.tags(companyId));
  }

  async createConclusion(
    assessmentId: string,
    dto: CreateConclusionDto,
    authorId: string,
  ) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (!assessment) throw new NotFoundException('Assessment not found');

    if (assessment.reviewerId !== authorId && !(await this.isHR(authorId))) {
      throw new ForbiddenException('Not authorized to submit this conclusion');
    }

    const [existing] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId));

    if (existing) throw new BadRequestException('Conclusion already exists');

    const [created] = await this.db
      .insert(assessmentConclusions)
      .values({
        assessmentId,
        ...dto,
        createdAt: new Date(),
      })
      .returning();

    if (created) {
      await this.db
        .update(performanceAssessments)
        .set({ status: 'submitted', submittedAt: new Date() })
        .where(eq(performanceAssessments.id, assessmentId));
      await this.invalidate(assessment.companyId);
    }

    return created;
  }

  async updateConclusion(
    assessmentId: string,
    dto: UpdateConclusionDto,
    authorId: string,
  ) {
    const [conclusion] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId));

    if (!conclusion) throw new NotFoundException('Conclusion not found');

    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (assessment?.reviewerId !== authorId && !(await this.isHR(authorId))) {
      throw new ForbiddenException('Not authorized to update this conclusion');
    }

    const [updated] = await this.db
      .update(assessmentConclusions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning();

    await this.invalidate(assessment.companyId);
    return updated;
  }

  /** Cached + versioned fetch. */
  async getConclusionByAssessment(assessmentId: string) {
    // need companyId for version scope
    const [assessment] = await this.db
      .select({
        companyId: performanceAssessments.companyId,
      })
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .limit(1);

    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.cache.getOrSetVersioned(
      assessment.companyId,
      ['assessments', 'conclusion', assessmentId],
      async () => {
        const [conclusion] = await this.db
          .select()
          .from(assessmentConclusions)
          .where(eq(assessmentConclusions.assessmentId, assessmentId));
        if (!conclusion) throw new NotFoundException('Conclusion not found');
        return conclusion;
      },
    );
  }

  // Role/permission check: look up the user's company role by userId.
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
