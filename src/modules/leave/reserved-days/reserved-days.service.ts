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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ReservedDaysService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:leave`,
      `company:${companyId}:leave:reserved-days`,
    ];
  }

  private rangesOverlap(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string,
  ) {
    const as = parseISO(aStart).getTime();
    const ae = parseISO(aEnd).getTime();
    const bs = parseISO(bStart).getTime();
    const be = parseISO(bEnd).getTime();
    return as <= be && ae >= bs;
  }

  async create(dto: CreateReservedDayDto, user: User) {
    const { startDate, endDate, employeeId } = dto;

    // Ensure dates are valid (start <= end)
    if (parseISO(startDate).getTime() > parseISO(endDate).getTime()) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate.',
      );
    }

    // Check overlap for the **same employee** in this company
    const existingReservedDays = await this.db
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
        ),
      )
      .execute();

    const conflict = existingReservedDays.find((day) =>
      this.rangesOverlap(day.startDate, day.endDate, startDate, endDate),
    );

    if (conflict) {
      throw new BadRequestException(
        'This date range overlaps with a reserved period.',
      );
    }

    const [reservedDay] = await this.db
      .insert(reservedLeaveDays)
      .values({
        employeeId,
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
      changes: { ...dto, companyId: user.companyId },
    });

    // Invalidate caches for this company
    await this.cache.bumpCompanyVersion(user.companyId);

    return reservedDay;
  }

  async getReservedDates(
    companyId: string,
    employeeId: string,
  ): Promise<string[]> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'reserved-days', 'dates', employeeId],
      async () => {
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
          range.forEach((date) => {
            allDates.push(format(date, 'yyyy-MM-dd'));
          });
        }
        return allDates;
      },
      { tags: this.tags(companyId) },
    );
  }

  async findAll(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'reserved-days', 'list'],
      async () => {
        return this.db
          .select({
            id: reservedLeaveDays.id,
            startDate: reservedLeaveDays.startDate,
            endDate: reservedLeaveDays.endDate,
            createdAt: reservedLeaveDays.createdAt,
            employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
            leaveType: leaveTypes.name,
            createdBy: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
            reason: reservedLeaveDays.reason,
          })
          .from(reservedLeaveDays)
          .innerJoin(users, eq(reservedLeaveDays.createdBy, users.id))
          .innerJoin(employees, eq(reservedLeaveDays.employeeId, employees.id))
          .innerJoin(
            leaveTypes,
            eq(reservedLeaveDays.leaveTypeId, leaveTypes.id),
          )
          .where(eq(reservedLeaveDays.companyId, companyId))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async findByEmployee(employeeId: string) {
    // We need the employee's companyId for versioning
    const [emp] = await this.db
      .select({ companyId: employees.companyId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .execute();

    const companyId = emp?.companyId ?? 'unknown';

    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'reserved-days', 'by-employee', employeeId],
      async () => {
        return this.db
          .select()
          .from(reservedLeaveDays)
          .where(eq(reservedLeaveDays.employeeId, employeeId))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'reserved-days', 'one', id],
      async () => {
        const [reservedDay] = await this.db
          .select()
          .from(reservedLeaveDays)
          .where(
            and(
              eq(reservedLeaveDays.id, id),
              eq(reservedLeaveDays.companyId, companyId),
            ),
          )
          .execute();

        if (!reservedDay) throw new NotFoundException('Reserved day not found');
        return reservedDay;
      },
      { tags: this.tags(companyId) },
    );
  }

  async update(id: string, dto: UpdateReservedDayDto, user: User) {
    // Ensure exists & belongs to company
    const [existing] = await this.db
      .select()
      .from(reservedLeaveDays)
      .where(
        and(
          eq(reservedLeaveDays.id, id),
          eq(reservedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();
    if (!existing) throw new NotFoundException('Reserved day not found');

    // Optional: overlap check if date fields are changing
    if ((dto.startDate && dto.endDate) || dto.startDate || dto.endDate) {
      const newStart = dto.startDate ?? existing.startDate;
      const newEnd = dto.endDate ?? existing.endDate;

      if (parseISO(newStart).getTime() > parseISO(newEnd).getTime()) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate.',
        );
      }

      if (existing.employeeId == null) {
        throw new BadRequestException('Reserved day is missing employeeId.');
      }
      const others = await this.db
        .select({
          startDate: reservedLeaveDays.startDate,
          endDate: reservedLeaveDays.endDate,
        })
        .from(reservedLeaveDays)
        .where(
          and(
            eq(reservedLeaveDays.companyId, user.companyId),
            eq(reservedLeaveDays.employeeId, existing.employeeId),
          ),
        )
        .execute();

      const conflict = others
        .filter(
          (r) =>
            !(
              r.startDate === existing.startDate &&
              r.endDate === existing.endDate
            ),
        )
        .find((r) =>
          this.rangesOverlap(r.startDate, r.endDate, newStart, newEnd),
        );

      if (conflict) {
        throw new BadRequestException(
          'This date range overlaps with a reserved period.',
        );
      }
    }

    const [updated] = await this.db
      .update(reservedLeaveDays)
      .set(dto)
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
      entityId: updated.id,
      userId: user.id,
      details: 'Reserved day updated',
      changes: { before: existing, after: updated },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return updated;
  }

  async remove(id: string, user: User) {
    // Ensure exists & belongs to company
    const [existing] = await this.db
      .select()
      .from(reservedLeaveDays)
      .where(
        and(
          eq(reservedLeaveDays.id, id),
          eq(reservedLeaveDays.companyId, user.companyId),
        ),
      )
      .execute();
    if (!existing) throw new NotFoundException('Reserved day not found');

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

    await this.cache.bumpCompanyVersion(user.companyId);
    return { message: 'Reserved day deleted successfully' };
  }
}
