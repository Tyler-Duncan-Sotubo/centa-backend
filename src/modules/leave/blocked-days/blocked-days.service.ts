import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { blockedLeaveDays } from './schema/blocked-day.schema';
import { AuditService } from 'src/modules/audit/audit.service';
import { and, eq, sql } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { users } from 'src/drizzle/schema';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class BlockedDaysService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(BlockedDaysService.name);
  }

  // ---------- cache keys ----------
  private listKey(companyId: string) {
    return `company:${companyId}:blockedDays:list`;
  }
  private datesKey(companyId: string) {
    return `company:${companyId}:blockedDays:dates`;
  }
  private oneKey(id: string) {
    return `blockedDay:${id}:detail`;
  }
  private async burst(companyId: string, id?: string) {
    const jobs = [
      this.cache.del(this.listKey(companyId)),
      this.cache.del(this.datesKey(companyId)),
    ];
    if (id) jobs.push(this.cache.del(this.oneKey(id)));
    await Promise.allSettled(jobs);
    this.logger.debug({ companyId, id }, 'cache:burst:blocked-days');
  }

  async create(dto: CreateBlockedDayDto, user: User) {
    this.logger.info(
      { companyId: user.companyId, dto },
      'blockedDay:create:start',
    );

    // Uniqueness check (scoped by company)
    const exists = await this.db
      .select({ id: blockedLeaveDays.id })
      .from(blockedLeaveDays)
      .where(
        and(
          eq(blockedLeaveDays.companyId, user.companyId),
          eq(blockedLeaveDays.date, dto.date),
        ),
      )
      .execute();

    if (exists.length > 0) {
      this.logger.warn(
        { date: dto.date, companyId: user.companyId },
        'blockedDay:create:duplicate',
      );
      throw new BadRequestException('This date is already blocked.');
    }

    const [blockedDay] = await this.db
      .insert(blockedLeaveDays)
      .values({
        ...dto,
        companyId: user.companyId,
        createdBy: user.id,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'blockedLeaveDays',
      entityId: blockedDay.id,
      userId: user.id,
      details: 'Blocked day created',
      changes: dto,
    });

    await this.burst(user.companyId, blockedDay.id);
    this.logger.info({ id: blockedDay.id }, 'blockedDay:create:done');
    return blockedDay;
  }

  async getBlockedDates(companyId: string): Promise<string[]> {
    const key = this.datesKey(companyId);
    this.logger.debug({ companyId, key }, 'blockedDay:dates:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const result = await this.db
        .select({ date: blockedLeaveDays.date })
        .from(blockedLeaveDays)
        .where(eq(blockedLeaveDays.companyId, companyId))
        .execute();

      const out = result.map(
        (r) =>
          ((r.date as any) instanceof Date
            ? (r.date as unknown as Date).toISOString()
            : String(r.date)
          ).split('T')[0],
      );

      this.logger.debug(
        { companyId, count: out.length },
        'blockedDay:dates:db:done',
      );
      return out;
    });
  }

  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ companyId, key }, 'blockedDay:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({
          id: blockedLeaveDays.id,
          date: blockedLeaveDays.date,
          reason: blockedLeaveDays.reason,
          createdAt: blockedLeaveDays.createdAt,
          createdBy: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          name: blockedLeaveDays.name,
        })
        .from(blockedLeaveDays)
        .innerJoin(users, eq(users.id, blockedLeaveDays.createdBy))
        .where(eq(blockedLeaveDays.companyId, companyId))
        .execute();

      this.logger.debug(
        { companyId, count: rows.length },
        'blockedDay:list:db:done',
      );
      return rows;
    });
  }

  async findOne(id: string) {
    const key = this.oneKey(id);
    this.logger.debug({ id, key }, 'blockedDay:one:cache:get');

    const row = await this.cache.getOrSetCache(key, async () => {
      const [blockedDay] = await this.db
        .select()
        .from(blockedLeaveDays)
        .where(eq(blockedLeaveDays.id, id))
        .execute();
      return blockedDay ?? null;
    });

    if (!row) {
      this.logger.warn({ id }, 'blockedDay:one:not-found');
      throw new NotFoundException('Blocked day not found');
    }
    return row;
  }

  async update(id: string, dto: UpdateBlockedDayDto, user: User) {
    this.logger.info(
      { id, companyId: user.companyId, dto },
      'blockedDay:update:start',
    );

    // ensure exists & company scope
    const [existing] = await this.db
      .select()
      .from(blockedLeaveDays)
      .where(
        and(
          eq(blockedLeaveDays.id, id),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();

    if (!existing) {
      this.logger.warn(
        { id, companyId: user.companyId },
        'blockedDay:update:not-found',
      );
      throw new NotFoundException('Blocked day not found');
    }

    const [updated] = await this.db
      .update(blockedLeaveDays)
      .set(dto)
      .where(
        and(
          eq(blockedLeaveDays.id, id),
          eq(blockedLeaveDays.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'blockedLeaveDays',
      entityId: id,
      userId: user.id,
      details: 'Blocked day updated',
      changes: dto,
    });

    await this.burst(user.companyId, id);
    this.logger.info({ id }, 'blockedDay:update:done');
    return updated;
  }

  async remove(id: string, user?: User) {
    this.logger.info(
      { id, companyId: user?.companyId },
      'blockedDay:remove:start',
    );

    const [existing] = await this.db
      .select({ companyId: blockedLeaveDays.companyId })
      .from(blockedLeaveDays)
      .where(eq(blockedLeaveDays.id, id))
      .execute();

    if (!existing) {
      this.logger.warn({ id }, 'blockedDay:remove:not-found');
      throw new NotFoundException('Blocked day not found');
    }

    await this.db
      .delete(blockedLeaveDays)
      .where(eq(blockedLeaveDays.id, id))
      .execute();

    if (user) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'blockedLeaveDays',
        entityId: id,
        userId: user?.id,
        details: 'Blocked day deleted',
        changes: {},
      });
    }

    if (!existing.companyId) {
      this.logger.error({ id }, 'blockedDay:remove:missing-companyId');
      throw new NotFoundException('Blocked day companyId not found');
    }
    await this.burst(existing.companyId, id);
    this.logger.info({ id }, 'blockedDay:remove:done');
    return { success: true };
  }
}
