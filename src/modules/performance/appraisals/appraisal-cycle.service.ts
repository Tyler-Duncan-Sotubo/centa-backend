import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpdateAppraisalCycleDto } from './dto/update-appraisal-cycle.dto';
import { performanceAppraisalCycles } from './schema/performance-appraisal-cycle.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class AppraisalCycleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(AppraisalCycleService.name);
  }

  // ---------- cache keys ----------
  private oneKey(companyId: string, id: string) {
    return `appraisalcycle:${companyId}:one:${id}`;
  }
  private listKey(companyId: string) {
    return `appraisalcycle:${companyId}:list`;
  }
  private currentKey(companyId: string) {
    return `appraisalcycle:${companyId}:current`;
  }
  private lastKey(companyId: string) {
    return `appraisalcycle:${companyId}:last`;
  }

  private async burst(opts: { companyId: string; id?: string }) {
    const jobs: Promise<any>[] = [];
    jobs.push(this.cache.del(this.listKey(opts.companyId)));
    jobs.push(this.cache.del(this.currentKey(opts.companyId)));
    jobs.push(this.cache.del(this.lastKey(opts.companyId)));
    if (opts.id)
      jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.id)));
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:appraisal-cycles');
  }

  // ---------- commands ----------
  async create(
    createDto: CreateAppraisalCycleDto,
    companyId: string,
    userId?: string,
  ) {
    this.logger.info({ companyId, name: createDto.name }, 'cycle:create:start');

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
      this.logger.warn(
        { companyId, name: createDto.name },
        'cycle:create:duplicate',
      );
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
      .returning()
      .execute();

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

    await this.burst({ companyId });
    this.logger.info({ id: created.id }, 'cycle:create:done');
    return created;
  }

  // ---------- queries (cached) ----------
  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'cycle:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(performanceAppraisalCycles)
        .where(eq(performanceAppraisalCycles.companyId, companyId))
        .orderBy(asc(performanceAppraisalCycles.startDate))
        .execute();

      const today = new Date().toISOString();
      const currentCycle = rows.find(
        (c) =>
          c.startDate <= today &&
          c.endDate >= today &&
          c.companyId === companyId,
      );

      const out = rows.map((cycle) => ({
        ...cycle,
        status: cycle.id === currentCycle?.id ? 'active' : 'upcoming',
      }));

      this.logger.debug({ companyId, count: out.length }, 'cycle:list:db:done');
      return out;
    });
  }

  async getLastCycle(companyId: string) {
    const key = this.lastKey(companyId);
    this.logger.debug({ key, companyId }, 'cycle:last:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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

  async findCurrent(companyId: string) {
    const key = this.currentKey(companyId);
    this.logger.debug({ key, companyId }, 'cycle:current:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
    const key = this.oneKey(companyId, id);
    this.logger.debug({ key, id, companyId }, 'cycle:one:cache:get');

    const cycle = await this.cache.getOrSetCache(key, async () => {
      const [row] = await this.db
        .select()
        .from(performanceAppraisalCycles)
        .where(
          and(
            eq(performanceAppraisalCycles.id, id),
            eq(performanceAppraisalCycles.companyId, companyId),
          ),
        )
        .execute();
      return row ?? null;
    });

    if (!cycle) {
      this.logger.warn({ id, companyId }, 'cycle:one:not-found');
      throw new NotFoundException(`Appraisal cycle with ID ${id} not found`);
    }

    const today = new Date().toISOString();
    const isActive = cycle.startDate <= today && cycle.endDate >= today;
    return { ...cycle, status: isActive ? 'active' : 'upcoming' };
  }

  async getLast(companyId: string) {
    // alias of getLastCycle to keep existing callers happy; uses the same cache
    return this.getLastCycle(companyId);
  }

  // ---------- mutations ----------
  async update(id: string, updateDto: UpdateAppraisalCycleDto, user: User) {
    this.logger.info({ id, userId: user.id }, 'cycle:update:start');
    await this.findOne(id, user.companyId); // validates & warms cache

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
      .returning()
      .execute();

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

    await this.burst({ companyId: user.companyId, id });
    this.logger.info({ id }, 'cycle:update:done');
    return updated;
  }

  async remove(id: string, user: User) {
    const { companyId, id: userId } = user;
    this.logger.info({ id, userId }, 'cycle:remove:start');

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

    await this.burst({ companyId, id });
    this.logger.info({ id }, 'cycle:remove:done');
    return { message: 'Cycle deleted successfully' };
  }
}
