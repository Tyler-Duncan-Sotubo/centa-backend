import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { Inject } from '@nestjs/common';
import { eq, and, isNull, or, inArray } from 'drizzle-orm';
import { performanceCompetencies } from '../schema/performance-competencies.schema';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { competencies } from './defaults';
import { performanceReviewQuestions } from '../schema/performance-review-questions.schema';
import { competencyLevels } from '../schema/performance-competency-levels.schema';

@Injectable()
export class PerformanceCompetencyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(
    companyId: string | null,
    dto: CreateCompetencyDto,
    userId: string,
  ) {
    const whereClause = companyId
      ? and(
          eq(performanceCompetencies.name, dto.name),
          eq(performanceCompetencies.companyId, companyId),
        )
      : and(
          eq(performanceCompetencies.name, dto.name),
          isNull(performanceCompetencies.companyId),
        );

    const existing = await this.db
      .select()
      .from(performanceCompetencies)
      .where(whereClause);

    if (existing.length > 0) {
      throw new BadRequestException(
        'Competency already exists for this company',
      );
    }

    const [created] = await this.db
      .insert(performanceCompetencies)
      .values({
        companyId,
        name: dto.name,
        description: dto.description,
        isGlobal: !companyId,
        isActive: true,
        createdAt: new Date(),
      })
      .returning();

    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_competency',
      entityId: created.id,
      userId,
      details: `Created competency: ${created.name}`,
      changes: {
        name: created.name,
        description: created.description,
      },
    });

    return created;
  }

  async getOnlyCompetencies(companyId: string) {
    const competencies = await this.db
      .select({
        id: performanceCompetencies.id,
        name: performanceCompetencies.name,
      })
      .from(performanceCompetencies)
      .where(
        or(
          eq(performanceCompetencies.companyId, companyId),
          eq(performanceCompetencies.isGlobal, true),
        ),
      );
    return competencies;
  }

  async getCompetenciesWithQuestions(companyId: string) {
    const competencies = await this.db
      .select()
      .from(performanceCompetencies)
      .where(
        or(
          eq(performanceCompetencies.companyId, companyId),
          eq(performanceCompetencies.isGlobal, true),
        ),
      );

    const competencyIds = competencies.map((c) => c.id);

    const questions = await this.db
      .select()
      .from(performanceReviewQuestions)
      .where(
        and(
          inArray(performanceReviewQuestions.competencyId, competencyIds),
          eq(performanceReviewQuestions.isActive, true),
        ),
      );

    const grouped = competencies.map((comp) => ({
      ...comp,
      questions: questions.filter((q) => q.competencyId === comp.id),
    }));

    return grouped;
  }

  async getById(id: string, companyId: string) {
    const [competency] = await this.db
      .select()
      .from(performanceCompetencies)
      .where(
        and(
          eq(performanceCompetencies.id, id),
          or(
            eq(performanceCompetencies.companyId, companyId),
            eq(performanceCompetencies.isGlobal, true),
          ),
        ),
      );

    if (!competency) throw new NotFoundException('Competency not found');
    if (competency.companyId !== companyId)
      throw new NotFoundException('Access denied');

    return competency;
  }

  async update(id: string, user: User, data: UpdateCompetencyDto) {
    const { companyId, id: userId } = user;
    const competency = await this.getById(id, companyId);

    await this.db
      .update(performanceCompetencies)
      .set({ ...data })
      .where(eq(performanceCompetencies.id, id));

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_competency',
      entityId: id,
      userId: userId,
      details: `Updated competency: ${competency.name}`,
      changes: {
        name: data.name ?? competency.name,
        description: data.description ?? competency.description,
      },
    });

    return { message: 'Updated successfully' };
  }

  async delete(id: string, user: User) {
    const { companyId, id: userId } = user;
    const competency = await this.getById(id, companyId);

    await this.db
      .delete(performanceCompetencies)
      .where(eq(performanceCompetencies.id, id));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_competency',
      entityId: id,
      userId: userId,
      details: `Deleted competency: ${competency.name}`,
    });

    return { message: 'Deleted successfully' };
  }

  async seedGlobalCompetencies() {
    for (const comp of competencies) {
      const existing = await this.db
        .select()
        .from(performanceCompetencies)
        .where(eq(performanceCompetencies.name, comp.name));

      if (existing.length === 0) {
        await this.db.insert(performanceCompetencies).values({
          name: comp.name,
          description: comp.description,
          isActive: true,
          isGlobal: true,
          companyId: null,
          createdAt: new Date(),
        });
      }
    }

    return { message: `${competencies.length} global competencies seeded.` };
  }

  ///  Seeds default competency levels if they do not already exist. -0-----------------

  async seedSystemLevels() {
    const defaultLevels = [
      { name: 'Beginner', weight: 1 },
      { name: 'Intermediate', weight: 2 },
      { name: 'Advanced', weight: 3 },
      { name: 'Proficient', weight: 4 },
      { name: 'Expert / Leader', weight: 5 },
    ];

    for (const level of defaultLevels) {
      const exists = await this.db
        .select()
        .from(competencyLevels)
        .where(eq(competencyLevels.name, level.name));

      if (exists.length === 0) {
        await this.db.insert(competencyLevels).values(level);
      }
    }

    return { message: 'System competency levels seeded successfully.' };
  }

  async getAllCompetencyLevels() {
    const levels = await this.db
      .select()
      .from(competencyLevels)
      .orderBy(competencyLevels.weight);

    return levels;
  }
}
