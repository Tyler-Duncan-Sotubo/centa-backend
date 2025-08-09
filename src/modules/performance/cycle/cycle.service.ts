import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { performanceCycles } from './schema/performance-cycles.schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class CycleService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(CycleService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `pc:${companyId}:list`;
  }
  private currentKey(companyId: string) {
    return `pc:${companyId}:current`;
  }
  private lastKey(companyId: string) {
    return `pc:${companyId}:last`;
  }
  private oneKey(id: string) {
    return `pc:id:${id}`;
  }

  private async burstCache(opts: { companyId?: string; id?: string }) {
    const jobs: Promise<any>[] = [];
    if (opts.companyId) {
      jobs.push(this.cache.del(this.listKey(opts.companyId)));
      jobs.push(this.cache.del(this.currentKey(opts.companyId)));
      jobs.push(this.cache.del(this.lastKey(opts.companyId)));
    }
    if (opts.id) jobs.push(this.cache.del(this.oneKey(opts.id)));
    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'cycle:cache:burst');
  }

  async create(
    createCycleDto: CreateCycleDto,
    companyId: string,
    userId?: string,
  ) {
    this.logger.info({ companyId, createCycleDto }, 'cycle:create:start');

    const existingCycle = await this.db
      .select()
      .from(performanceCycles)
      .where(
        and(
          eq(performanceCycles.name, createCycleDto.name),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .execute();

    if (existingCycle.length > 0) {
      this.logger.warn(
        { companyId, name: createCycleDto.name },
        'cycle:create:duplicate-name',
      );
      throw new BadRequestException('Cycle with this name already exists');
    }

    const today = new Date();
    const startDate = new Date(createCycleDto.startDate);
    const endDate = new Date(createCycleDto.endDate);

    if (endDate < startDate) {
      this.logger.warn({ startDate, endDate }, 'cycle:create:bad-dates');
      throw new BadRequestException('End date must be after start date');
    }

    // If either boundary is in the past or today, mark active
    const status = startDate <= today || endDate <= today ? 'active' : 'draft';

    const [newCycle] = await this.db
      .insert(performanceCycles)
      .values({
        ...createCycleDto,
        status,
        companyId,
      })
      .returning();

    if (userId) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_cycle',
        entityId: newCycle.id,
        userId,
        details: `Created performance cycle ${newCycle.name}`,
        changes: {
          name: newCycle.name,
          companyId,
          startDate: newCycle.startDate,
          endDate: newCycle.endDate,
          status: newCycle.status,
        },
      });
    }

    await this.burstCache({ companyId, id: newCycle.id });
    this.logger.info({ id: newCycle.id }, 'cycle:create:done');
    return newCycle;
  }

  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'cycle:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const cycles = await this.db
        .select()
        .from(performanceCycles)
        .where(eq(performanceCycles.companyId, companyId))
        .orderBy(desc(performanceCycles.startDate))
        .execute();

      this.logger.debug(
        { companyId, count: cycles.length },
        'cycle:findAll:db:done',
      );
      return cycles;
    });
  }

  async findCurrent(companyId: string) {
    const key = this.currentKey(companyId);
    this.logger.debug({ companyId, key }, 'cycle:findCurrent:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

      const currentCycle = await this.db
        .select()
        .from(performanceCycles)
        .where(
          and(
            eq(performanceCycles.companyId, companyId),
            lte(performanceCycles.startDate, todayStr),
            gte(performanceCycles.endDate, todayStr),
          ),
        )
        .orderBy(desc(performanceCycles.startDate))
        .limit(1)
        .execute();

      const curr = currentCycle[0] ?? null;
      this.logger.debug(
        { companyId, found: Boolean(curr) },
        'cycle:findCurrent:db:done',
      );
      return curr;
    });
  }

  async findOne(id: string) {
    const key = this.oneKey(id);
    this.logger.debug({ id, key }, 'cycle:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [cycle] = await this.db
        .select()
        .from(performanceCycles)
        .where(eq(performanceCycles.id, id))
        .execute();

      if (!cycle) {
        this.logger.warn({ id }, 'cycle:findOne:not-found');
        throw new NotFoundException(
          `Performance cycle with ID ${id} not found.`,
        );
      }

      return cycle;
    });
  }

  async getLastCycle(companyId: string) {
    const key = this.lastKey(companyId);
    this.logger.debug({ companyId, key }, 'cycle:getLast:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const [lastCycle] = await this.db
        .select()
        .from(performanceCycles)
        .where(eq(performanceCycles.companyId, companyId))
        .orderBy(desc(performanceCycles.startDate))
        .limit(1)
        .execute();

      this.logger.debug(
        { companyId, found: Boolean(lastCycle) },
        'cycle:getLast:db:done',
      );
      return lastCycle ?? null;
    });
  }

  async update(id: string, updateCycleDto: UpdateCycleDto, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ id, userId, updateCycleDto }, 'cycle:update:start');

    await this.findOne(id); // ensure exists (cached)

    const [updatedCycle] = await this.db
      .update(performanceCycles)
      .set(updateCycleDto)
      .where(
        and(
          eq(performanceCycles.id, id),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_cycle',
      entityId: id,
      userId,
      details: `Updated performance cycle ${updatedCycle.name}`,
      changes: {
        ...updateCycleDto,
        id: updatedCycle.id,
        companyId: updatedCycle.companyId,
        startDate: updatedCycle.startDate,
        endDate: updatedCycle.endDate,
        status: updatedCycle.status,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      },
    });

    await this.burstCache({ companyId, id });
    this.logger.info({ id }, 'cycle:update:done');
    return updatedCycle;
  }

  async remove(id: string, user: User) {
    const { id: userId, companyId } = user;
    this.logger.info({ id, userId, companyId }, 'cycle:remove:start');

    await this.findOne(id); // ensure exists (cached)

    await this.db
      .delete(performanceCycles)
      .where(
        and(
          eq(performanceCycles.id, id),
          eq(performanceCycles.companyId, companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'performance_cycle',
      entityId: id,
      userId,
      details: `Deleted performance cycle with ID ${id}`,
      changes: {
        id,
        companyId,
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
      },
    });

    await this.burstCache({ companyId, id });
    this.logger.info({ id }, 'cycle:remove:done');
  }
}
