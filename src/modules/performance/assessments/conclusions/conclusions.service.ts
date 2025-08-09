import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';
import { CreateConclusionDto } from './dto/create-conclusion.dto';
import { UpdateConclusionDto } from './dto/update-conclusion.dto';
import { assessmentConclusions } from '../schema/performance-assessment-conclusions.schema';
import { performanceAssessments } from '../schema/performance-assessments.schema';
import { companyRoles, users } from 'src/drizzle/schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AssessmentConclusionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(AssessmentConclusionsService.name);
  }

  // ---------- cache keys ----------
  private oneKey(assessmentId: string) {
    return `assessment:conclusion:${assessmentId}`;
  }
  private async burst(assessmentId: string) {
    await this.cache.del(this.oneKey(assessmentId));
    this.logger.debug({ assessmentId }, 'cache:burst:assessment-conclusion');
  }

  // ---------- commands ----------
  async createConclusion(
    assessmentId: string,
    dto: CreateConclusionDto,
    authorId: string,
  ) {
    this.logger.info({ assessmentId, authorId }, 'conclusion:create:start');

    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .execute();

    if (!assessment) {
      this.logger.warn({ assessmentId }, 'conclusion:create:not-found');
      throw new NotFoundException('Assessment not found');
    }

    const isHr = await this.isHR(authorId);
    if (assessment.reviewerId !== authorId && !isHr) {
      this.logger.warn(
        { assessmentId, authorId },
        'conclusion:create:forbidden',
      );
      throw new ForbiddenException('Not authorized to submit this conclusion');
    }

    const [existing] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .execute();

    if (existing) {
      this.logger.warn({ assessmentId }, 'conclusion:create:duplicate');
      throw new BadRequestException('Conclusion already exists');
    }

    const [created] = await this.db
      .insert(assessmentConclusions)
      .values({
        assessmentId,
        ...dto,
        createdAt: new Date(),
      })
      .returning()
      .execute();

    if (created) {
      await this.db
        .update(performanceAssessments)
        .set({ status: 'submitted' })
        .where(eq(performanceAssessments.id, assessmentId))
        .execute();
    }

    await this.burst(assessmentId);
    this.logger.info(
      { id: created.id, assessmentId },
      'conclusion:create:done',
    );
    return created;
  }

  async updateConclusion(
    assessmentId: string,
    dto: UpdateConclusionDto,
    authorId: string,
  ) {
    this.logger.info({ assessmentId, authorId }, 'conclusion:update:start');

    const [conclusion] = await this.db
      .select()
      .from(assessmentConclusions)
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .execute();

    if (!conclusion) {
      this.logger.warn({ assessmentId }, 'conclusion:update:not-found');
      throw new NotFoundException('Conclusion not found');
    }

    const [assessment] = await this.db
      .select()
      .from(performanceAssessments)
      .where(eq(performanceAssessments.id, assessmentId))
      .execute();

    const isHr = await this.isHR(authorId);
    if (assessment?.reviewerId !== authorId && !isHr) {
      this.logger.warn(
        { assessmentId, authorId },
        'conclusion:update:forbidden',
      );
      throw new ForbiddenException('Not authorized to update this conclusion');
    }

    const [updated] = await this.db
      .update(assessmentConclusions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(assessmentConclusions.assessmentId, assessmentId))
      .returning()
      .execute();

    await this.burst(assessmentId);
    this.logger.info(
      { id: updated.id, assessmentId },
      'conclusion:update:done',
    );
    return updated;
  }

  // ---------- queries (cached) ----------
  async getConclusionByAssessment(assessmentId: string) {
    const key = this.oneKey(assessmentId);
    this.logger.debug({ key, assessmentId }, 'conclusion:get:cache:get');

    const row = await this.cache.getOrSetCache(key, async () => {
      const [conclusion] = await this.db
        .select()
        .from(assessmentConclusions)
        .where(eq(assessmentConclusions.assessmentId, assessmentId))
        .execute();
      return conclusion ?? null;
    });

    if (!row) {
      this.logger.warn({ assessmentId }, 'conclusion:get:not-found');
      throw new NotFoundException('Conclusion not found');
    }

    return row;
  }

  // ---------- helpers ----------
  // Role/permission check (best-effort; adjust to your actual schema)
  private async isHR(userId: string): Promise<boolean> {
    this.logger.debug({ userId }, 'conclusion:isHR:check');
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
