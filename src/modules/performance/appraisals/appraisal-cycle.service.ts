import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from './dto/update-appraisal-cycle.dto';
import { performanceAppraisalCycles } from './schema/performance-appraisal-cycle.schema';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AppraisalCycleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  /** Common versioned cache prefix for this module */
  private ns(companyId: string) {
    return ['performance', 'appraisal-cycles', companyId] as const;
  }
  /** Helpful tags for cross-feature invalidation / observability */
  private tags(companyId: string) {
    return [
      `company:${companyId}`,
      'performance',
      'performance:appraisal-cycles',
    ];
  }
  /** Invalidate all cached views for this company’s cycles */
  private async bump(companyId: string) {
    // Bump the version for the whole namespace; all derived keys become stale.
    await this.cache.bumpCompanyVersion(companyId);
  }

  async create(
    createDto: CreateAppraisalCycleDto,
    companyId: string,
    userId?: string,
  ) {
    const existing = await this.db
      .select()
      .from(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.name, createDto.name),
          eq(performanceAppraisalCycles.companyId, companyId),
        ),
      )
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException('Appraisal cycle name already exists');
    }

    const [created] = await this.db
      .insert(performanceAppraisalCycles)
      .values({
        ...createDto,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        companyId,
      })
      .returning();

    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_appraisal_cycle',
        entityId: created.id,
        userId,
        details: `Created appraisal cycle ${created.name}`,
        changes: {
          name: created.name,
          companyId,
          startDate: created.startDate,
          endDate: created.endDate,
          status: created.status,
        },
      });
    }

    await this.bump(companyId);
    return created;
  }

  async findAll(companyId: string) {
    const key = [...this.ns(companyId), 'all'] as const;

    const rows = await this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () =>
        this.db
          .select()
          .from(performanceAppraisalCycles)
          .where(eq(performanceAppraisalCycles.companyId, companyId))
          .orderBy(asc(performanceAppraisalCycles.startDate))
          .execute(),
    );

    const nowIso = new Date().toISOString();
    const current = rows.find(
      (c) => c.startDate <= nowIso && c.endDate >= nowIso,
    );

    return rows.map((c) => ({
      ...c,
      status: c.id === current?.id ? 'active' : 'upcoming',
    }));
  }

  async getLastCycle(companyId: string) {
    const key = [...this.ns(companyId), 'last'] as const;

    return this.cache.getOrSetVersioned(companyId, [...key], async () => {
      const [lastCycle] = await this.db
        .select()
        .from(performanceAppraisalCycles)
        .where(eq(performanceAppraisalCycles.companyId, companyId))
        .orderBy(desc(performanceAppraisalCycles.startDate))
        .limit(1)
        .execute();
      return lastCycle ?? null;
    });
  }

  /** alias kept for compatibility */
  async getLast(companyId: string) {
    return this.getLastCycle(companyId);
  }

  async findCurrent(companyId: string) {
    // Key includes day stamp so “current” rolls naturally while still cached briefly.
    const day = new Date().toISOString().slice(0, 10);
    const key = [...this.ns(companyId), 'current', day] as const;

    return this.cache.getOrSetVersioned(companyId, [...key], async () => {
      const today = new Date().toISOString();
      const current = await this.db
        .select()
        .from(performanceAppraisalCycles)
        .where(
          and(
            eq(performanceAppraisalCycles.companyId, companyId),
            lte(performanceAppraisalCycles.startDate, today),
            gte(performanceAppraisalCycles.endDate, today),
          ),
        )
        .orderBy(desc(performanceAppraisalCycles.startDate))
        .limit(1)
        .execute();
      return current[0] ?? null;
    });
  }

  async findOne(id: string, companyId: string) {
    const key = [...this.ns(companyId), 'one', id] as const;

    const cycle = await this.cache.getOrSetVersioned(
      companyId,
      [...key],
      async () => {
        const [row] = await this.db
          .select()
          .from(performanceAppraisalCycles)
          .where(
            and(
              eq(performanceAppraisalCycles.id, id),
              eq(performanceAppraisalCycles.companyId, companyId),
            ),
          )
          .limit(1)
          .execute();
        return row ?? null;
      },
    );

    if (!cycle) {
      throw new NotFoundException(`Appraisal cycle with ID ${id} not found`);
    }

    const nowIso = new Date().toISOString();
    const isActive = cycle.startDate <= nowIso && cycle.endDate >= nowIso;
    return { ...cycle, status: isActive ? 'active' : 'upcoming' };
  }

  async update(id: string, updateDto: UpdateAppraisalCycleDto, user: User) {
    await this.findOne(id, user.companyId);

    const [updated] = await this.db
      .update(performanceAppraisalCycles)
      .set({
        ...updateDto,
        startDate: updateDto.startDate,
        endDate: updateDto.endDate,
      })
      .where(
        and(
          eq(performanceAppraisalCycles.id, id),
          eq(performanceAppraisalCycles.companyId, user.companyId),
        ),
      )
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_appraisal_cycle',
      entityId: id,
      userId: user.id,
      details: `Updated appraisal cycle ${updated.name}`,
      changes: {
        ...updateDto,
        updatedAt: new Date().toISOString(),
      },
    });

    await this.bump(user.companyId);
    return updated;
  }

  async remove(id: string, user: User) {
    const { companyId, id: userId } = user;

    await this.findOne(id, companyId);

    await this.db
      .delete(performanceAppraisalCycles)
      .where(
        and(
          eq(performanceAppraisalCycles.id, id),
          eq(performanceAppraisalCycles.companyId, companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_appraisal_cycle',
      entityId: id,
      userId,
      details: `Deleted appraisal cycle ${id}`,
      changes: {
        deletedAt: new Date().toISOString(),
      },
    });

    await this.bump(companyId);
    return { message: 'Cycle deleted successfully' };
  }

  // Make a stable bigint key from company+cycle (hash in app, or use pg_advisory_lock with two ints)
  private lockKey(companyId: string, cycleId: string) {
    // naive: use first 15 hex of a hash as bigint; or compute in SQL
    return BigInt(
      '0x' +
        Buffer.from(companyId + cycleId)
          .toString('hex')
          .slice(0, 15),
    );
  }

  async withCompanyCycleLock<T>(
    companyId: string,
    cycleId: string,
    run: () => Promise<T>,
  ) {
    const key = this.lockKey(companyId, cycleId);
    const got = await this.db.execute(
      sql`SELECT pg_try_advisory_lock(${key}) AS locked`,
    );
    const locked = Array.isArray(got)
      ? (got[0] as any).locked
      : (got as any).rows?.[0]?.locked;
    if (!locked) {
      return;
    }
    try {
      return await run();
    } finally {
      await this.db.execute(sql`SELECT pg_advisory_unlock(${key})`);
    }
  }
}
