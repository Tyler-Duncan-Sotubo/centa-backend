import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReservedDayDto } from './dto/create-reserved-day.dto';
import { UpdateReservedDayDto } from './dto/update-reserved-day.dto';
import { reservedLeaveDays } from './schema/reserved-day.schema';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { and, eq, sql } from 'drizzle-orm';
import { User } from 'src/common/types/user.type';
import { employees, users } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';
import { parseISO, eachDayOfInterval, format } from 'date-fns';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ReservedDaysService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(ReservedDaysService.name);
  }

  // ---------- cache keys ----------
  private oneKey(id: string) {
    return `reserved:${id}:detail`;
  }
  private listKey(companyId: string) {
    return `company:${companyId}:reserved:list`;
  }
  private byEmployeeKey(companyId: string, employeeId: string) {
    return `company:${companyId}:reserved:emp:${employeeId}`;
  }
  private datesKey(companyId: string, employeeId: string) {
    return `company:${companyId}:reserved:dates:${employeeId}`;
  }
  private async burst(opts: {
    companyId?: string;
    id?: string;
    employeeId?: string;
  }) {
    const jobs: Promise<any>[] = [];
    if (opts.id) jobs.push(this.cache.del(this.oneKey(opts.id)));
    if (opts.companyId) {
      jobs.push(this.cache.del(this.listKey(opts.companyId)));
      if (opts.employeeId) {
        jobs.push(
          this.cache.del(this.byEmployeeKey(opts.companyId, opts.employeeId)),
        );
        jobs.push(
          this.cache.del(this.datesKey(opts.companyId, opts.employeeId)),
        );
      }
    }
    await Promise.allSettled(jobs);
    this.logger.debug({ ...opts }, 'cache:burst:reserved');
  }

  // ---------- helpers ----------
  /**
   * Checks overlap at the application level to complement the DB-level check.
   */
  private overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
    const aS = parseISO(aStart);
    const aE = parseISO(aEnd);
    const bS = parseISO(bStart);
    const bE = parseISO(bEnd);
    return aS <= bE && aE >= bS;
  }

  // ---------- commands ----------
  async create(dto: CreateReservedDayDto, user: User) {
    this.logger.info(
      { companyId: user.companyId, dto },
      'reserved:create:start',
    );

    const { startDate, endDate, employeeId } = dto;

    // Basic guard
    if (parseISO(endDate) < parseISO(startDate)) {
      this.logger.warn({ startDate, endDate }, 'reserved:create:invalid-range');
      throw new BadRequestException('endDate must be on or after startDate');
    }

    // Check overlap in DB to avoid race conditions
    const [overlap] = await this.db
      .select({
        id: reservedLeaveDays.id,
        startDate: reservedLeaveDays.startDate,
        endDate: reservedLeaveDays.endDate,
      })
      .from(reservedLeaveDays)
      .where(
        and(
          eq(reservedLeaveDays.companyId, user.companyId),
          eq(reservedLeaveDays.employeeId, employeeId),
          // (existing.start <= new.end) AND (existing.end >= new.start)
          sql`(${reservedLeaveDays.startDate} <= ${endDate}) AND (${reservedLeaveDays.endDate} >= ${startDate})`,
        ),
      )
      .execute();

    if (overlap) {
      this.logger.warn(
        { companyId: user.companyId, overlap },
        'reserved:create:conflict',
      );
      throw new BadRequestException(
        'This date range overlaps with a reserved period.',
      );
    }

    // Insert new reserved day range
    const [reservedDay] = await this.db
      .insert(reservedLeaveDays)
      .values({
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        reason: dto.reason,
        companyId: user.companyId,
        createdBy: user.id,
      })
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'create',
      entity: 'reservedLeaveDays',
      entityId: reservedDay.id,
      userId: user.id,
      details: 'Reserved day created',
      changes: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        reason: dto.reason,
        companyId: user.companyId,
      },
    });

    await this.burst({ companyId: user.companyId, employeeId: dto.employeeId });
    this.logger.info({ id: reservedDay.id }, 'reserved:create:done');
    return reservedDay;
  }

  async getReservedDates(
    companyId: string,
    employeeId: string,
  ): Promise<string[]> {
    const key = this.datesKey(companyId, employeeId);
    this.logger.debug(
      { key, companyId, employeeId },
      'reserved:dates:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const reserved = await this.db
        .select({
          startDate: reservedLeaveDays.startDate,
          endDate: reservedLeaveDays.endDate,
        })
        .from(reservedLeaveDays)
        .where(
          and(
            eq(reservedLeaveDays.companyId, companyId),
            eq(reservedLeaveDays.employeeId, employeeId),
          ),
        )
        .execute();

      const allDates: string[] = [];
      for (const entry of reserved) {
        const range = eachDayOfInterval({
          start: parseISO(entry.startDate),
          end: parseISO(entry.endDate),
        });
        range.forEach((date) => allDates.push(format(date, 'yyyy-MM-dd')));
      }
      this.logger.debug(
        { companyId, employeeId, count: allDates.length },
        'reserved:dates:db:done',
      );
      return allDates;
    });
  }

  async findAll(companyId: string) {
    const key = this.listKey(companyId);
    this.logger.debug({ key, companyId }, 'reserved:list:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select({
          id: reservedLeaveDays.id,
          startDate: reservedLeaveDays.startDate,
          endDate: reservedLeaveDays.endDate,
          createdAt: reservedLeaveDays.createdAt,
          employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
          leaveType: leaveTypes.name,
          createdBy: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
          reason: reservedLeaveDays.reason,
          employeeId: reservedLeaveDays.employeeId,
        })
        .from(reservedLeaveDays)
        .innerJoin(users, eq(reservedLeaveDays.createdBy, users.id))
        .innerJoin(employees, eq(reservedLeaveDays.employeeId, employees.id))
        .innerJoin(leaveTypes, eq(reservedLeaveDays.leaveTypeId, leaveTypes.id))
        .where(eq(reservedLeaveDays.companyId, companyId))
        .execute();
      this.logger.debug(
        { companyId, count: rows.length },
        'reserved:list:db:done',
      );
      return rows;
    });
  }

  async findByEmployee(companyId: string, employeeId: string) {
    const key = this.byEmployeeKey(companyId, employeeId);
    this.logger.debug(
      { key, companyId, employeeId },
      'reserved:byEmp:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const rows = await this.db
        .select()
        .from(reservedLeaveDays)
        .where(
          and(
            eq(reservedLeaveDays.companyId, companyId),
            eq(reservedLeaveDays.employeeId, employeeId),
          ),
        )
        .execute();
      this.logger.debug(
        { companyId, employeeId, count: rows.length },
        'reserved:byEmp:db:done',
      );
      return rows;
    });
  }

  async findOne(id: string, user: User) {
    const key = this.oneKey(id);
    this.logger.debug(
      { key, id, companyId: user.companyId },
      'reserved:findOne:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
      const [res] = await this.db
        .select()
        .from(reservedLeaveDays)
        .where(
          and(
            eq(reservedLeaveDays.id, id),
            eq(reservedLeaveDays.companyId, user.companyId),
          ),
        )
        .execute();
      return res ?? null;
    });

    if (!row) {
      this.logger.warn(
        { id, companyId: user.companyId },
        'reserved:findOne:not-found',
      );
      throw new NotFoundException('Reserved day not found');
    }
    return row;
  }

  async update(id: string, dto: UpdateReservedDayDto, user: User) {
    this.logger.info(
      { id, companyId: user.companyId, dto },
      'reserved:update:start',
    );

    // Ensure it exists and is within company
    const existing = await this.findOne(id, user);

    // If dates are changing, ensure no overlap for the same employee
    const newStart = dto.startDate ?? existing.startDate;
    const newEnd = dto.endDate ?? existing.endDate;
    const empId = dto.employeeId ?? existing.employeeId;

    if (!empId) {
      this.logger.warn({ empId }, 'reserved:update:missing-employeeId');
      throw new BadRequestException('employeeId is required for update');
    }

    if (parseISO(newEnd) < parseISO(newStart)) {
      this.logger.warn({ newStart, newEnd }, 'reserved:update:invalid-range');
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const [conflict] = await this.db
      .select({
        id: reservedLeaveDays.id,
        startDate: reservedLeaveDays.startDate,
        endDate: reservedLeaveDays.endDate,
      })
      .from(reservedLeaveDays)
      .where(
        and(
          eq(reservedLeaveDays.companyId, user.companyId),
          eq(reservedLeaveDays.employeeId, empId),
          // exclude the current record
          sql`${reservedLeaveDays.id} <> ${id}`,
          // overlap check
          sql`(${reservedLeaveDays.startDate} <= ${newEnd}) AND (${reservedLeaveDays.endDate} >= ${newStart})`,
        ),
      )
      .execute();

    if (conflict) {
      this.logger.warn({ id, conflict }, 'reserved:update:conflict');
      throw new BadRequestException(
        'Updated date range overlaps with an existing reserved period.',
      );
    }

    const [updated] = await this.db
      .update(reservedLeaveDays)
      .set({ ...dto })
      .where(
        and(
          eq(reservedLeaveDays.id, id),
          eq(reservedLeaveDays.companyId, user.companyId),
        ),
      )
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'reservedLeaveDays',
      entityId: id,
      userId: user.id,
      details: 'Reserved day updated',
      changes: { ...dto },
    });

    await this.burst({ companyId: user.companyId, id, employeeId: empId });
    this.logger.info({ id }, 'reserved:update:done');
    return updated;
  }

  async remove(id: string, user: User) {
    this.logger.info(
      { id, companyId: user.companyId },
      'reserved:delete:start',
    );

    const existing = await this.findOne(id, user);

    await this.db
      .delete(reservedLeaveDays)
      .where(
        and(
          eq(reservedLeaveDays.id, id),
          eq(reservedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();

    await this.auditService.logAction({
      action: 'delete',
      entity: 'reservedLeaveDays',
      entityId: id,
      userId: user.id,
      details: 'Reserved day deleted',
      changes: { id, companyId: user.companyId },
    });

    await this.burst({
      companyId: user.companyId,
      id,
      employeeId: existing.employeeId ?? undefined,
    });
    this.logger.info({ id }, 'reserved:delete:done');
    return { message: 'Reserved day deleted successfully' };
  }
}
