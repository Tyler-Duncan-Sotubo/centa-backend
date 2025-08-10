import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { employeeShifts } from '../schema/employee-shifts.schema';
import { User } from 'src/common/types/user.type';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { auditLogs } from 'src/modules/audit/schema';
import { BulkCreateEmployeeShiftDto } from './dto/bulk-assign-employee-shifts.dto';
import {
  companyLocations,
  employees,
  jobRoles,
  shifts,
} from 'src/drizzle/schema';
import { toCamelCase } from 'src/utils/toCamelCase';
import { UpdateEmployeeShiftDto } from './dto/update-employee-shift.dto';
import { CacheService } from 'src/common/cache/cache.service';

type CalendarEvent = {
  date: string;
  startTime: string;
  endTime: string;
  employeeId: string;
  shiftId: string;
  employeeName: string;
  locationId: string;
  jobTitle: string;
  id: string;
  shiftName: string;
};

@Injectable()
export class EmployeeShiftsService {
  constructor(
    private readonly auditService: AuditService,
    @Inject(DRIZZLE) private readonly db: db,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(EmployeeShiftsService.name);
  }

  // ===== Cache key helpers =====
  private listAllKey(companyId: string) {
    return `company:${companyId}:empShifts:listAll`;
  }
  private listAllPagedKey(
    companyId: string,
    page: number,
    limit: number,
    search?: string,
    shiftId?: string,
  ) {
    return `company:${companyId}:empShifts:paged:p=${page}:l=${limit}:s=${search ?? ''}:sh=${shiftId ?? ''}`;
  }
  private getOneKey(companyId: string, id: string) {
    return `company:${companyId}:empShifts:one:${id}`;
  }
  private byEmployeeKey(companyId: string, employeeId: string) {
    return `company:${companyId}:empShifts:byEmployee:${employeeId}`;
  }
  private byShiftKey(companyId: string, shiftId: string) {
    return `company:${companyId}:empShifts:byShift:${shiftId}`;
  }
  private activeForDayKey(companyId: string, employeeId: string, date: string) {
    return `company:${companyId}:empShifts:active:${employeeId}:${date}`;
  }
  private calendarKey(companyId: string, from: string, to: string) {
    return `company:${companyId}:empShifts:calendar:${from}:${to}`;
  }

  // optional: if your CacheService supports pattern delete; shim gracefully
  private async delPrefix(prefix: string) {
    const anyCache = this.cache as any;
    if (typeof anyCache.delPrefix === 'function') {
      return anyCache.delPrefix(prefix);
    }
    // fallback: best-effort single-key delete (no-op for prefixes)
    return this.cache.del(prefix);
  }

  private async burstAll(
    companyId: string,
    opts?: {
      ids?: string[];
      employeeIds?: string[];
      shiftIds?: string[];
      dates?: string[];
    },
  ) {
    this.logger.debug({ companyId, opts }, 'cache.burstAll:start');
    const jobs: Promise<any>[] = [];

    // hot lists
    jobs.push(this.cache.del(this.listAllKey(companyId)));
    // paged lists: prefer prefix delete where supported
    jobs.push(this.delPrefix(`company:${companyId}:empShifts:paged:`));
    // calendar can be wide; best-effort prefix
    jobs.push(this.delPrefix(`company:${companyId}:empShifts:calendar:`));

    if (opts?.ids?.length) {
      for (const id of opts.ids)
        jobs.push(this.cache.del(this.getOneKey(companyId, id)));
    }
    if (opts?.employeeIds?.length) {
      for (const e of opts.employeeIds)
        jobs.push(this.cache.del(this.byEmployeeKey(companyId, e)));
    }
    if (opts?.shiftIds?.length) {
      for (const s of opts.shiftIds)
        jobs.push(this.cache.del(this.byShiftKey(companyId, s)));
    }
    if (opts?.dates?.length && opts?.employeeIds?.length) {
      for (const e of opts.employeeIds) {
        for (const d of opts.dates)
          jobs.push(this.cache.del(this.activeForDayKey(companyId, e, d)));
      }
    }

    await Promise.allSettled(jobs);
    this.logger.debug({ companyId }, 'cache.burstAll:done');
  }

  private calendarVerKey(companyId: string) {
    return `company:${companyId}:empShifts:calendar:ver`;
  }
  private async bumpCalendarVersion(companyId: string) {
    // use incr if available; else set a timestamp-based token
    const anyCache = this.cache as any;
    if (typeof anyCache.incr === 'function') {
      await anyCache.incr(this.calendarVerKey(companyId));
    } else {
      await this.cache.set(
        this.calendarVerKey(companyId),
        Date.now().toString(),
      );
    }
  }
  private async getCalendarVersion(companyId: string): Promise<string> {
    const v = await this.cache.get(this.calendarVerKey(companyId));
    if (v) return String(v);
    await this.bumpCalendarVersion(companyId);
    return String(await this.cache.get(this.calendarVerKey(companyId)));
  }

  // ===== Internal helpers =====
  private baseEmployeeShiftQuery() {
    return this.db
      .select({
        id: employeeShifts.id,
        employeeId: employeeShifts.employeeId,
        shiftId: employeeShifts.shiftId,
        shiftDate: employeeShifts.shiftDate,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      })
      .from(employeeShifts)
      .leftJoin(employees, eq(employees.id, employeeShifts.employeeId));
  }

  private async assertNoOverlap(
    companyId: string,
    employeeId: string,
    shiftDate: string,
  ) {
    this.logger.debug(
      { companyId, employeeId, shiftDate },
      'assertNoOverlap:check',
    );
    const overlapping = await this.db
      .select()
      .from(employeeShifts)
      .where(
        and(
          eq(employeeShifts.companyId, companyId),
          eq(employeeShifts.employeeId, employeeId),
          eq(employeeShifts.shiftDate, shiftDate),
          eq(employeeShifts.isDeleted, false),
        ),
      )
      .execute();

    if (overlapping.length > 0) {
      this.logger.warn(
        { companyId, employeeId, shiftDate },
        'assertNoOverlap:found',
      );
      throw new BadRequestException(
        `Employee ${employeeId} already has a shift assigned on ${shiftDate}`,
      );
    }
  }

  // ===== Commands (mutations) =====
  async assignShift(
    employeeId: string,
    dto: CreateEmployeeShiftDto,
    user: User,
    ip: string,
  ) {
    this.logger.info(
      { employeeId, dto, companyId: user.companyId },
      'assignShift:start',
    );

    // 1) Fetch employee
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.companyId, user.companyId),
        ),
      )
      .execute();

    if (!employee) {
      this.logger.warn({ employeeId }, 'assignShift:employee:not-found');
      throw new BadRequestException(`Employee ${employeeId} not found.`);
    }

    // 2) Fetch shift
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(
        and(eq(shifts.id, dto.shiftId), eq(shifts.companyId, user.companyId)),
      )
      .execute();

    if (!shift) {
      this.logger.warn({ shiftId: dto.shiftId }, 'assignShift:shift:not-found');
      throw new BadRequestException(`Shift ${dto.shiftId} not found.`);
    }

    // 3) Location validation
    if (shift.locationId && shift.locationId !== employee.locationId) {
      this.logger.warn(
        {
          employeeLocationId: employee.locationId,
          shiftLocationId: shift.locationId,
        },
        'assignShift:location:mismatch',
      );
      throw new BadRequestException(
        `Employee's location does not match shift location.`,
      );
    }

    // 4) Overlap check
    await this.assertNoOverlap(user.companyId, employeeId, dto.shiftDate);

    // 5) Insert assignment
    const [rec] = await this.db
      .insert(employeeShifts)
      .values({
        companyId: user.companyId,
        employeeId,
        shiftId: dto.shiftId,
        shiftDate: dto.shiftDate,
      })
      .returning()
      .execute();

    // 6) Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'employee shift',
      details: 'Created new employee shift assignment',
      entityId: rec.id,
      userId: user.id,
      ipAddress: ip,
      changes: { before: {}, after: rec },
    });

    // 7) Cache burst
    // 4) Cache burst + bump calendar version
    await this.burstAll(user.companyId, {
      ids: [rec.id],
      employeeIds: [employeeId],
      shiftIds: [dto.shiftId],
      dates: [dto.shiftDate],
    });
    await this.bumpCalendarVersion(user.companyId); // <--- NEW

    const ver = await this.getCalendarVersion(user.companyId); // <--- NEW
    this.logger.info({ id: rec.id, calendarVer: ver }, 'assignShift:done');
    return rec;
  }

  async updateShift(
    employeeShiftId: string,
    dto: UpdateEmployeeShiftDto,
    user: User,
    ip: string,
  ) {
    this.logger.info(
      { employeeShiftId, dto, companyId: user.companyId },
      'updateShift:start',
    );

    // 1) Fetch employee shift
    const [employeeShift] = await this.db
      .select()
      .from(employeeShifts)
      .where(
        and(
          eq(employeeShifts.companyId, user.companyId),
          eq(employeeShifts.id, employeeShiftId),
        ),
      )
      .execute();

    if (!employeeShift) {
      this.logger.warn({ employeeShiftId }, 'updateShift:not-found');
      throw new NotFoundException(
        `Employee shift ${employeeShiftId} not found.`,
      );
    }

    // 2) Update assignment
    const [updatedRec] = await this.db
      .update(employeeShifts)
      .set({ shiftDate: dto.shiftDate })
      .where(
        and(
          eq(employeeShifts.companyId, user.companyId),
          eq(employeeShifts.id, employeeShiftId),
        ),
      )
      .returning()
      .execute();

    // 3) Audit
    await this.auditService.logAction({
      action: 'update',
      entity: 'employee shift',
      entityId: employeeShift.id,
      details: 'Updated employee shift assignment',
      userId: user.id,
      ipAddress: ip,
      changes: { before: employeeShift, after: updatedRec },
    });

    // 4) Cache burst + bump calendar version
    await this.burstAll(user.companyId, {
      ids: [employeeShiftId],
      employeeIds: [employeeShift.employeeId],
      shiftIds: employeeShift.shiftId ? [employeeShift.shiftId] : [],
      dates: [employeeShift.shiftDate, dto.shiftDate].filter(
        (d): d is string => typeof d === 'string',
      ),
    });
    await this.bumpCalendarVersion(user.companyId); // <--- NEW

    const ver = await this.getCalendarVersion(user.companyId); // <--- NEW
    this.logger.info(
      { id: employeeShiftId, calendarVer: ver },
      'updateShift:done',
    );

    // Return version so UI can refetch with ?_v=<ver>
    return { ...updatedRec, _calendarVersion: ver }; // <--- NEW
  }

  async bulkAssignMany(
    companyId: string,
    dtos: BulkCreateEmployeeShiftDto[],
    user: User,
    ip: string,
  ) {
    this.logger.info({ companyId, count: dtos.length }, 'bulkAssignMany:start');

    // 1) Fetch all needed shifts
    const shiftIds = [...new Set(dtos.map((d) => d.shiftId))];
    const shiftRecords = await this.db
      .select()
      .from(shifts)
      .where(and(inArray(shifts.id, shiftIds), eq(shifts.companyId, companyId)))
      .execute();
    const shiftMap = new Map(shiftRecords.map((s) => [s.id, s]));

    // 2) Fetch all needed employees
    const employeeIds = [...new Set(dtos.map((d) => d.employeeId))];
    const employeeRecords = await this.db
      .select()
      .from(employees)
      .where(
        and(
          inArray(employees.id, employeeIds),
          eq(employees.companyId, companyId),
        ),
      )
      .execute();
    const employeeMap = new Map(employeeRecords.map((e) => [e.id, e]));

    // 3) Validate
    for (const dto of dtos) {
      const shift = shiftMap.get(dto.shiftId);
      const employee = employeeMap.get(dto.employeeId);

      if (!shift) {
        this.logger.warn(
          { shiftId: dto.shiftId },
          'bulkAssignMany:shift:not-found',
        );
        throw new BadRequestException(`Shift ${dto.shiftId} not found.`);
      }
      if (!employee) {
        this.logger.warn(
          { employeeId: dto.employeeId },
          'bulkAssignMany:employee:not-found',
        );
        throw new BadRequestException(`Employee ${dto.employeeId} not found.`);
      }
      if (shift.locationId && shift.locationId !== employee.locationId) {
        this.logger.warn(
          { employeeId: dto.employeeId, shiftId: dto.shiftId },
          'bulkAssignMany:location:mismatch',
        );
        throw new BadRequestException(
          `Employee ${dto.employeeId} cannot be assigned to shift ${dto.shiftId} at different location.`,
        );
      }
    }

    // 4) Overlap checks
    for (const { employeeId, shiftDate } of dtos) {
      await this.assertNoOverlap(companyId, employeeId, shiftDate);
    }

    // 5) Transactional insert + audit
    const inserted = await this.db.transaction(async (trx) => {
      const now = new Date();

      const shiftRows = dtos.map((d) => ({
        companyId,
        employeeId: d.employeeId,
        shiftId: d.shiftId,
        shiftDate: d.shiftDate,
      }));

      const newShifts = await trx
        .insert(employeeShifts)
        .values(shiftRows)
        .returning()
        .execute();

      const auditRows = newShifts.map((rec) => ({
        action: 'employee-shift-assignment',
        entity: 'time.employee-shift',
        entityId: rec.id,
        userId: user.id,
        ipAddress: ip,
        changes: { before: {}, after: rec },
        createdAt: now,
      }));

      await trx.insert(auditLogs).values(auditRows).execute();
      return newShifts;
    });

    // 6) Cache burst
    await this.burstAll(companyId, {
      ids: inserted.map((r) => r.id),
      employeeIds: [...new Set(dtos.map((d) => d.employeeId))],
      shiftIds: [...new Set(dtos.map((d) => d.shiftId))],
      dates: [...new Set(dtos.map((d) => d.shiftDate))],
    });

    this.logger.info({ inserted: inserted.length }, 'bulkAssignMany:done');
    return inserted;
  }

  async removeAssignment(assignmentId: string, user: User, ip: string) {
    this.logger.info(
      { assignmentId, companyId: user.companyId },
      'removeAssignment:start',
    );

    const existing = await this.db
      .select()
      .from(employeeShifts)
      .where(
        and(
          eq(employeeShifts.companyId, user.companyId),
          eq(employeeShifts.id, assignmentId),
          eq(employeeShifts.isDeleted, false),
        ),
      )
      .execute();

    if (existing.length === 0) {
      this.logger.warn({ assignmentId }, 'removeAssignment:not-found');
      throw new NotFoundException(`Assignment ${assignmentId} not found.`);
    }

    const [oldRec] = await this.db
      .update(employeeShifts)
      .set({ isDeleted: true })
      .where(
        and(
          eq(employeeShifts.companyId, user.companyId),
          eq(employeeShifts.id, assignmentId),
          eq(employeeShifts.isDeleted, false),
        ),
      )
      .returning()
      .execute();

    await this.db
      .insert(auditLogs)
      .values({
        action: 'delete',
        entity: 'employee-shift',
        entityId: assignmentId,
        details: 'Soft-deleted employee shift assignment',
        userId: user.id,
        ipAddress: ip,
        changes: { before: oldRec, after: { ...oldRec, isDeleted: true } },
      })
      .execute();

    await this.burstAll(user.companyId, {
      ids: [assignmentId],
      employeeIds: [oldRec.employeeId],
      shiftIds: oldRec.shiftId ? [oldRec.shiftId] : [],
      dates: [oldRec.shiftDate],
    });

    await this.bumpCalendarVersion(user.companyId); // <--- NEW

    const ver = await this.getCalendarVersion(user.companyId); // <--- NEW
    this.logger.info(
      { assignmentId, calendarVer: ver },
      'removeAssignment:done',
    );
    return { success: true };
  }

  async bulkRemoveAssignments(employeeIds: string[], user: User, ip: string) {
    this.logger.info(
      { companyId: user.companyId, employeeIds },
      'bulkRemoveAssignments:start',
    );

    const oldRecs = await this.db
      .update(employeeShifts)
      .set({ isDeleted: true })
      .where(
        and(
          eq(employeeShifts.companyId, user.companyId),
          inArray(employeeShifts.employeeId, employeeIds),
          eq(employeeShifts.isDeleted, false),
        ),
      )
      .returning()
      .execute();

    if (oldRecs.length === 0) {
      this.logger.info({ removed: 0 }, 'bulkRemoveAssignments:done');
      return { success: true, removedCount: 0 };
    }

    const auditRows = oldRecs.map((rec) => ({
      action: 'delete',
      entity: 'employee shift',
      details: 'Soft-deleted employee shift assignment',
      entityId: rec.id,
      userId: user.id,
      ipAddress: ip,
      changes: { before: rec, after: { ...rec, isDeleted: true } },
    }));
    await this.db.insert(auditLogs).values(auditRows).execute();

    const shiftIds = [
      ...new Set(oldRecs.map((r) => r.shiftId).filter(Boolean)),
    ] as string[];
    const dates = [
      ...new Set(oldRecs.map((r) => r.shiftDate).filter(Boolean)),
    ] as string[];
    await this.burstAll(user.companyId, {
      ids: oldRecs.map((r) => r.id),
      employeeIds,
      shiftIds,
      dates,
    });

    this.logger.info({ removed: oldRecs.length }, 'bulkRemoveAssignments:done');
    return { success: true, removedCount: oldRecs.length };
  }

  // ===== Queries (reads) =====
  async listAll(companyId: string) {
    const key = this.listAllKey(companyId);
    this.logger.debug({ companyId, key }, 'listAll:cache:get');
    return this.cache.getOrSetCache(key, async () => {
      this.logger.debug({ companyId }, 'listAll:db:query');
      return this.baseEmployeeShiftQuery()
        .where(
          and(
            eq(employeeShifts.companyId, companyId),
            eq(employeeShifts.isDeleted, false),
          ),
        )
        .execute();
    });
  }

  async listAllPaginated(
    companyId: string,
    {
      page = 1,
      limit = 20,
      search,
      shiftId,
    }: {
      page?: number;
      limit?: number;
      search?: string;
      shiftId?: string;
    },
  ) {
    const key = this.listAllPagedKey(companyId, page, limit, search, shiftId);
    this.logger.debug(
      { companyId, page, limit, search, shiftId, key },
      'listAllPaginated:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      const offset = (page - 1) * limit;

      const conditions = [
        eq(employeeShifts.companyId, companyId),
        eq(employeeShifts.isDeleted, false),
      ];
      if (search) {
        conditions.push(
          sql<boolean>`CONCAT(${employees.firstName}, ' ', ${employees.lastName}) ILIKE ${'%' + search + '%'}`,
        );
      }
      if (shiftId) conditions.push(eq(employeeShifts.shiftId, shiftId));

      this.logger.debug({ companyId, conditions }, 'listAllPaginated:db:data');
      const data = await this.baseEmployeeShiftQuery()
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .execute();

      this.logger.debug({ companyId }, 'listAllPaginated:db:count');
      const [{ count }] = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(employeeShifts)
        .leftJoin(employees, eq(employees.id, employeeShifts.employeeId))
        .where(and(...conditions))
        .execute();

      return {
        data,
        pagination: {
          total: Number(count),
          page,
          limit,
          totalPages: Math.ceil(Number(count) / limit),
        },
      };
    });
  }

  async getOne(companyId: string, assignmentId: string) {
    const key = this.getOneKey(companyId, assignmentId);
    this.logger.debug({ companyId, assignmentId, key }, 'getOne:cache:get');
    const rec = await this.cache.getOrSetCache(key, async () => {
      const [row] = await this.baseEmployeeShiftQuery()
        .where(
          and(
            eq(employeeShifts.companyId, companyId),
            eq(employeeShifts.id, assignmentId),
            eq(employeeShifts.isDeleted, false),
          ),
        )
        .execute();
      return row ?? null;
    });
    if (!rec) {
      this.logger.warn({ companyId, assignmentId }, 'getOne:not-found');
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }
    return rec;
  }

  async listByEmployee(companyId: string, employeeId: string) {
    const key = this.byEmployeeKey(companyId, employeeId);
    this.logger.debug(
      { companyId, employeeId, key },
      'listByEmployee:cache:get',
    );
    return this.cache.getOrSetCache(key, async () => {
      return this.baseEmployeeShiftQuery()
        .where(
          and(
            eq(employeeShifts.companyId, companyId),
            eq(employeeShifts.employeeId, employeeId),
            eq(employeeShifts.isDeleted, false),
          ),
        )
        .execute();
    });
  }

  async getActiveShiftForEmployee(
    employeeId: string,
    companyId: string,
    date: string,
  ) {
    const key = this.activeForDayKey(companyId, employeeId, date);
    this.logger.debug(
      { companyId, employeeId, date, key },
      'getActiveShiftForEmployee:cache:get',
    );
    return this.cache.getOrSetCache(key, async () => {
      const [assignment] = await this.db
        .select({ shiftId: employeeShifts.shiftId })
        .from(employeeShifts)
        .where(
          and(
            eq(employeeShifts.companyId, companyId),
            eq(employeeShifts.employeeId, employeeId),
            eq(employeeShifts.isDeleted, false),
            eq(employeeShifts.shiftDate, date),
          ),
        )
        .execute();

      if (!assignment) return null;

      const [shiftRow] = await this.db
        .select()
        .from(shifts)
        .where(
          and(
            assignment.shiftId ? eq(shifts.id, assignment.shiftId) : sql`false`,
            eq(shifts.companyId, companyId),
            eq(shifts.isDeleted, false),
          ),
        )
        .execute();

      return shiftRow || null;
    });
  }

  async listByShift(companyId: string, shiftId: string) {
    const key = this.byShiftKey(companyId, shiftId);
    this.logger.debug({ companyId, shiftId, key }, 'listByShift:cache:get');
    return this.cache.getOrSetCache(key, async () => {
      return this.baseEmployeeShiftQuery()
        .where(
          and(
            eq(employeeShifts.companyId, companyId),
            eq(employeeShifts.shiftId, shiftId),
            eq(employeeShifts.isDeleted, false),
          ),
        )
        .execute();
    });
  }

  async getCalendarEvents(
    companyId: string,
    from: string,
    to: string,
  ): Promise<Record<string, CalendarEvent[]>> {
    const ver = await this.getCalendarVersion(companyId); // <--- NEW
    const key = `${this.calendarKey(companyId, from, to)}:v=${ver}`; // <--- UPDATED
    this.logger.debug(
      { companyId, from, to, key },
      'getCalendarEvents:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
      this.logger.debug({ companyId, from, to }, 'getCalendarEvents:db:query');

      const assignments = await this.db
        .select({
          id: employeeShifts.id,
          employeeId: employees.id,
          shiftId: employeeShifts.shiftId,
          shiftDate: employeeShifts.shiftDate,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          shiftName: shifts.name,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          location: companyLocations.name,
          locationId: companyLocations.id,
          jobTitle: jobRoles.title,
        })
        .from(employees)
        .leftJoin(
          employeeShifts,
          and(
            eq(employees.id, employeeShifts.employeeId),
            eq(employeeShifts.companyId, companyId),
            eq(employeeShifts.isDeleted, false),
            gte(employeeShifts.shiftDate, from),
            lte(employeeShifts.shiftDate, to),
          ),
        )
        .leftJoin(shifts, eq(shifts.id, employeeShifts.shiftId))
        .leftJoin(
          companyLocations,
          eq(companyLocations.id, employees.locationId),
        )
        .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
        .where(
          and(
            eq(employees.companyId, companyId),
            eq(employees.employmentStatus, 'active'),
          ),
        )
        .execute();

      const groupedEvents: Record<string, CalendarEvent[]> = {};

      for (const a of assignments) {
        const location = a.location || 'Main Office';
        if (!groupedEvents[location]) groupedEvents[location] = [];

        if (!a.shiftId || !a.shiftDate) {
          groupedEvents[location].push({
            id: a.id || '',
            date: '',
            startTime: '',
            endTime: '',
            employeeId: a.employeeId,
            shiftId: '',
            shiftName: '',
            employeeName: a.employeeName,
            locationId: a.locationId || '',
            jobTitle: a.jobTitle || '',
          });
          continue;
        }

        groupedEvents[location].push({
          id: a.id || '',
          date: a.shiftDate,
          startTime: a.startTime ?? '',
          endTime: a.endTime ?? '',
          employeeId: a.employeeId,
          shiftId: a.shiftId,
          employeeName: a.employeeName,
          locationId: a.locationId ?? '',
          jobTitle: a.jobTitle ?? '',
          shiftName: a.shiftName ?? '',
        });
      }

      const camelCasedGroupedEvents: Record<string, CalendarEvent[]> = {};
      for (const [location, events] of Object.entries(groupedEvents)) {
        const camelKey = toCamelCase(location);
        camelCasedGroupedEvents[camelKey] = events;
      }

      await this.cache.set(key, camelCasedGroupedEvents); // <--- NEW

      return camelCasedGroupedEvents;
    });
  }
}
