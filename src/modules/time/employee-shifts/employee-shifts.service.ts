import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from 'src/modules/audit/audit.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { employeeShifts } from '../schema/employee-shifts.schema';
import { User } from 'src/common/types/user.type';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { auditLogs } from 'src/modules/audit/schema';
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
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 10; // 10 minutes
  private tags(companyId: string) {
    return [
      `company:${companyId}:attendance`,
      `company:${companyId}:attendance:employee-shifts`,
    ];
  }

  private async assertNoOverlap(
    companyId: string,
    employeeId: string,
    shiftDate: string, // yyyy-MM-dd
  ) {
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
      throw new BadRequestException(
        `Employee ${employeeId} already has a shift assigned on ${shiftDate}`,
      );
    }
  }

  async assignShift(
    employeeId: string,
    dto: CreateEmployeeShiftDto,
    user: User,
    ip: string,
  ) {
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
      throw new BadRequestException(`Shift ${dto.shiftId} not found.`);
    }

    // 3) Location validation
    if (shift.locationId && shift.locationId !== employee.locationId) {
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

    // Invalidate reads
    await this.cache.bumpCompanyVersion(user.companyId);

    return rec;
  }

  async updateShift(
    employeeShiftId: string,
    dto: UpdateEmployeeShiftDto,
    user: User,
    ip: string,
  ) {
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
      throw new NotFoundException(
        `Employee shift ${employeeShiftId} not found.`,
      );
    }

    // 2) Update assignment
    const [updatedRec] = await this.db
      .update(employeeShifts)
      .set({
        shiftDate: dto.shiftDate,
      })
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

    await this.cache.bumpCompanyVersion(user.companyId);

    return updatedRec;
  }

  async bulkAssignMany(
    companyId: string,
    dtos: Array<{ employeeId: string; shiftId: string; shiftDate: string }>,
    user: User,
    ip: string,
  ) {
    // 1) Fetch all needed shift records
    const shiftIds = [...new Set(dtos.map((d) => d.shiftId))];
    const shiftRecords = await this.db
      .select()
      .from(shifts)
      .where(and(inArray(shifts.id, shiftIds), eq(shifts.companyId, companyId)))
      .execute();

    const shiftMap = new Map(shiftRecords.map((s) => [s.id, s]));

    // 2) Fetch all needed employee records
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

    // 3) Validate shifts and employee locations
    for (const dto of dtos) {
      const shift = shiftMap.get(dto.shiftId);
      const employee = employeeMap.get(dto.employeeId);

      if (!shift) {
        throw new BadRequestException(`Shift ${dto.shiftId} not found.`);
      }
      if (!employee) {
        throw new BadRequestException(`Employee ${dto.employeeId} not found.`);
      }

      // Location validation
      if (shift.locationId && shift.locationId !== employee.locationId) {
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

    await this.cache.bumpCompanyVersion(companyId);

    return inserted;
  }

  async removeAssignment(assignmentId: string, user: User, ip: string) {
    // 1) Check if the assignment exists
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
      throw new NotFoundException(`Assignment ${assignmentId} not found.`);
    }

    // 2) Mark as deleted & return the record
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

    // 3) Audit log
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

    await this.cache.bumpCompanyVersion(user.companyId);

    return { success: true };
  }

  /** Bulk “soft‐delete” by employee IDs */
  async bulkRemoveAssignments(employeeIds: string[], user: User, ip: string) {
    // 1) Update all matching rows, return the old records
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
      return { success: true, removedCount: 0 };
    }

    // 2) Bulk audit‐log in one call
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

    await this.cache.bumpCompanyVersion(user.companyId);

    return { success: true, removedCount: oldRecs.length };
  }

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

  async listAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee-shifts', 'list'],
      () =>
        this.baseEmployeeShiftQuery()
          .where(
            and(
              eq(employeeShifts.companyId, companyId),
              eq(employeeShifts.isDeleted, false),
            ),
          )
          .execute(),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
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
    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    const conditions = [
      eq(employeeShifts.companyId, companyId),
      eq(employeeShifts.isDeleted, false),
    ];

    if (search) {
      conditions.push(
        sql<boolean>`CONCAT(${employees.firstName}, ' ', ${employees.lastName}) ILIKE ${'%' + search + '%'}`,
      );
    }

    if (shiftId) {
      conditions.push(eq(employeeShifts.shiftId, shiftId));
    }

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'attendance',
        'employee-shifts',
        'page',
        String(page),
        'limit',
        String(limit),
        'q',
        search ?? '',
        'shift',
        shiftId ?? '',
      ],
      async () => {
        const data = await this.baseEmployeeShiftQuery()
          .where(and(...conditions))
          .limit(limit)
          .offset(offset)
          .execute();

        const [{ count }] = await this.db
          .select({
            count: sql<number>`COUNT(*)`,
          })
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getOne(companyId: string, assignmentId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee-shifts', 'one', assignmentId],
      async () => {
        const [rec] = await this.baseEmployeeShiftQuery()
          .where(
            and(
              eq(employeeShifts.companyId, companyId),
              eq(employeeShifts.id, assignmentId),
              eq(employeeShifts.isDeleted, false),
            ),
          )
          .execute();

        if (!rec) {
          throw new NotFoundException(`Assignment ${assignmentId} not found`);
        }
        return rec;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async listByEmployee(companyId: string, employeeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee-shifts', 'by-employee', employeeId],
      () =>
        this.baseEmployeeShiftQuery()
          .where(
            and(
              eq(employeeShifts.companyId, companyId),
              eq(employeeShifts.employeeId, employeeId),
              eq(employeeShifts.isDeleted, false),
            ),
          )
          .execute(),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getActiveShiftForEmployee(
    employeeId: string,
    companyId: string,
    date: string, // 'YYYY-MM-DD'
  ) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee-shifts', 'active', employeeId, date],
      async () => {
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

        if (!assignment) {
          return null;
        }

        const [shiftRec] = await this.db
          .select()
          .from(shifts)
          .where(
            and(
              assignment.shiftId
                ? eq(shifts.id, assignment.shiftId)
                : sql`false`,
              eq(shifts.companyId, companyId),
              eq(shifts.isDeleted, false),
            ),
          )
          .execute();

        return shiftRec || null;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async listByShift(companyId: string, shiftId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee-shifts', 'by-shift', shiftId],
      () =>
        this.baseEmployeeShiftQuery()
          .where(
            and(
              eq(employeeShifts.companyId, companyId),
              eq(employeeShifts.shiftId, shiftId),
              eq(employeeShifts.isDeleted, false),
            ),
          )
          .execute(),
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }

  async getCalendarEvents(
    companyId: string,
    from: string,
    to: string,
  ): Promise<Record<string, CalendarEvent[]>> {
    return this.cache.getOrSetVersioned<Record<string, CalendarEvent[]>>(
      companyId,
      ['attendance', 'employee-shifts', 'calendar', from, to],
      async () => {
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

          if (!groupedEvents[location]) {
            groupedEvents[location] = [];
          }

          // If shiftDate or shiftId is missing, treat as "unassigned"
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

        // Convert location names to camelCase keys
        const camelCasedGroupedEvents: Record<string, CalendarEvent[]> = {};
        for (const [location, events] of Object.entries(groupedEvents)) {
          const camelKey = toCamelCase(location);
          camelCasedGroupedEvents[camelKey] = events;
        }

        return camelCasedGroupedEvents;
      },
      { ttlSeconds: this.ttlSeconds, tags: this.tags(companyId) },
    );
  }
}
