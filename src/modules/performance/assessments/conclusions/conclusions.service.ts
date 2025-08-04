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

@Injectable()
export class AssessmentConclusionsService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  async createConclusion(
    assessmentId: string,
    dto: CreateConclusionDto,
    authorId: string,
  ) {
    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    if (assessment.reviewerId !== authorId && !this.isHR(authorId)) {
      throw new ForbiddenException('Not authorized to submit this conclusion');
    }

    const [existing] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId));

    if (existing) {
      throw new BadRequestException('Conclusion already exists');
    }

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
        .set({ status: 'submitted' })
        .where(eq(performanceAssessments.id, assessmentId));
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

    if (!conclusion) {
      throw new NotFoundException('Conclusion not found');
    }

    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId));

    if (assessment?.reviewerId !== authorId && !this.isHR(authorId)) {
      throw new ForbiddenException('Not authorized to update this conclusion');
    }

    const [updated] = await this.db
      .update(assessmentConclusions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning();

    return updated;
  }

  async getConclusionByAssessment(assessmentId: string) {
    const [conclusion] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId));

    if (!conclusion) {
      throw new NotFoundException('Conclusion not found');
    }

    return conclusion;
  }

  // Stub: Replace with role/permission check
  private async isHR(userId: string): Promise<boolean> {
    const [userRole] = await this.db
      .select()
      .from(companyRoles)
      .innerJoin(users, eq(users.companyId, companyRoles.companyId))
      .where(eq(companyRoles.companyId, userId));

    return (
      userRole?.company_roles?.name === 'hr_manager' ||
      userRole?.company_roles?.name === 'admin' ||
      userRole?.company_roles?.name === 'super_admin'
    );
  }
}
