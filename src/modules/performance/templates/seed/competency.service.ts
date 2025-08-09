import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { performanceCompetencies } from '../schema/performance-competencies.schema';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { competencies as defaultCompetencies } from './defaults';
import { performanceReviewQuestions } from '../schema/performance-review-questions.schema';
import { competencyLevels } from '../schema/performance-competency-levels.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class PerformanceCompetencyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(PerformanceCompetencyService.name);
  }

  // ---------- cache keys ----------
  private onlyListKey(companyId: string) {
    return `pcmp:${companyId}:only`;
  }
  private withQListKey(companyId: string) {
    return `pcmp:${companyId}:withq`;
  }
  private oneKey(companyId: string, id: string) {
    return `pcmp:${companyId}:one:${id}`;
  }
  private levelsKey() {
    return `pcmp:levels`;
  }

  private async burst(opts: {
    companyId?: string;
    competencyId?: string;
    levels?: boolean;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) {
      jobs.push(this.cache.del(this.onlyListKey(opts.companyId)));
      jobs.push(this.cache.del(this.withQListKey(opts.companyId)));
      if (opts.competencyId)
        jobs.push(
          this.cache.del(this.oneKey(opts.companyId, opts.competencyId)),
        );
    }
    if (opts.levels) {
      jobs.push(this.cache.del(this.levelsKey()));
    }
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'competency:cache:burst');
  }

  // ---------- mutations ----------
  async create(
    companyId: string | null,
    dto: CreateCompetencyDto,
    userId: string,
  ) {
    this.logger.info({ companyId, dto, userId }, 'competency:create:start');

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
      this.logger.warn(
        { companyId, name: dto.name },
        'competency:create:duplicate',
      );
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
      changes: { name: created.name, description: created.description },
    });

    // burst company cache if companyId provided; for globals we can’t burst all companies
    if (companyId) await this.burst({ companyId, competencyId: created.id });
    this.logger.info({ id: created.id }, 'competency:create:done');
    return created;
  }

  async update(id: string, user: User, data: UpdateCompetencyDto) {
    this.logger.info({ id, userId: user.id, data }, 'competency:update:start');

    const { companyId, id: userId } = user;
    const competency = await this.getById(id, companyId);

    const [updated] = await this.db
      .update(performanceCompetencies)
      .set({ ...data })
      .where(eq(performanceCompetencies.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_competency',
      entityId: id,
      userId,
      details: `Updated competency: ${competency.name}`,
      changes: {
        name: data.name ?? competency.name,
        description: data.description ?? competency.description,
      },
    });

    await this.burst({ companyId, competencyId: id });
    this.logger.info({ id }, 'competency:update:done');
    return updated;
  }

  async delete(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'competency:delete:start');

    const { companyId, id: userId } = user;
    const competency = await this.getById(id, companyId);

    await this.db
      .delete(performanceCompetencies)
      .where(eq(performanceCompetencies.id, id));

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_competency',
      entityId: id,
      userId,
      details: `Deleted competency: ${competency.name}`,
    });

    await this.burst({ companyId, competencyId: id });
    this.logger.info({ id }, 'competency:delete:done');
    return { message: 'Deleted successfully' };
  }

  async seedGlobalCompetencies() {
    this.logger.info({}, 'competency:seedGlobals:start');

    for (const comp of defaultCompetencies) {
      const existing = await this.db
        .select()
        .from(performanceCompetencies)
        .where(
          and(
            eq(performanceCompetencies.name, comp.name),
            isNull(performanceCompetencies.companyId),
          ),
        );

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

    // Global list caches are per-company; can’t burst all. Log only.
    this.logger.info(
      { count: defaultCompetencies.length },
      'competency:seedGlobals:done',
    );
    return {
      message: `${defaultCompetencies.length} global competencies seeded.`,
    };
  }

  async seedSystemLevels() {
    this.logger.info({}, 'competency:seedLevels:start');

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

    await this.burst({ levels: true });
    this.logger.info({}, 'competency:seedLevels:done');
    return { message: 'System competency levels seeded successfully.' };
  }

  // ---------- queries (cached) ----------
  async getOnlyCompetencies(companyId: string) {
    const key = this.onlyListKey(companyId);
    this.logger.debug({ companyId, key }, 'competency:getOnly:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
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

      this.logger.debug(
        { companyId, count: rows.length },
        'competency:getOnly:db:done',
      );
      return rows;
    });
  }

  async getCompetenciesWithQuestions(companyId: string) {
    const key = this.withQListKey(companyId);
    this.logger.debug({ companyId, key }, 'competency:getWithQ:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const comps = await this.db
        .select()
        .from(performanceCompetencies)
        .where(
          or(
            eq(performanceCompetencies.companyId, companyId),
            eq(performanceCompetencies.isGlobal, true),
          ),
        );

      const ids = comps.map((c) => c.id);
      if (ids.length === 0) return [];

      const questions = await this.db
        .select()
        .from(performanceReviewQuestions)
        .where(
          and(
            inArray(performanceReviewQuestions.competencyId, ids),
            eq(performanceReviewQuestions.isActive, true),
          ),
        );

      const grouped = comps.map((comp) => ({
        ...comp,
        questions: questions.filter((q) => q.competencyId === comp.id),
      }));

      this.logger.debug(
        { companyId, count: grouped.length },
        'competency:getWithQ:db:done',
      );
      return grouped;
    });
  }

  async getById(id: string, companyId: string) {
    const key = this.oneKey(companyId, id);
    this.logger.debug({ companyId, id, key }, 'competency:getById:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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

      if (!competency) {
        this.logger.warn({ id, companyId }, 'competency:getById:not-found');
        throw new NotFoundException('Competency not found');
      }

      // FIX: allow global competencies; only deny if it’s not global AND companyId mismatches
      if (!competency.isGlobal && competency.companyId !== companyId) {
        this.logger.warn({ id, companyId }, 'competency:getById:forbidden');
        throw new NotFoundException('Access denied');
      }

      return competency;
    });
  }

  async getAllCompetencyLevels() {
    const key = this.levelsKey();
    this.logger.debug({ key }, 'competency:getLevels:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const levels = await this.db
        .select()
        .from(competencyLevels)
        .orderBy(competencyLevels.weight);
      this.logger.debug(
        { count: levels.length },
        'competency:getLevels:db:done',
      );
      return levels;
    });
  }
}
