import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
import {
  isWithinInterval,
  parseISO,
  eachDayOfInterval,
  format,
} from 'date-fns';

@Injectable()
export class ReservedDaysService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateReservedDayDto, user: User) {
    const { startDate, endDate } = dto;

    // Fetch existing reserved dates for company
    const existingReservedDays = await this.db
      .select()
      .from(reservedLeaveDays)
      .where(eq(reservedLeaveDays.companyId, user.companyId))
      .execute();

    // Check if any existing reserved day overlaps
    const conflict = existingReservedDays.find(
      (day) =>
        isWithinInterval(parseISO(day.startDate), {
          start: parseISO(startDate),
          end: parseISO(endDate),
        }) ||
        isWithinInterval(parseISO(day.endDate), {
          start: parseISO(startDate),
          end: parseISO(endDate),
        }),
    );

    if (conflict) {
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

    // Log audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'reservedLeaveDays',
      entityId: reservedDay.id,
      userId: user.id,
      details: 'Reserved day created',
      changes: JSON.stringify(dto),
    });

    return reservedDay;
  }

  async getReservedDates(
    companyId: string,
    employeeId: string,
  ): Promise<string[]> {
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
  }

  async findAll(companyId: string) {
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
      .innerJoin(leaveTypes, eq(reservedLeaveDays.leaveTypeId, leaveTypes.id))
      .where(eq(reservedLeaveDays.companyId, companyId))
      .execute();
  }

  async findByEmployee(employeeId: string) {
    return this.db
      .select()
      .from(reservedLeaveDays)
      .where(eq(reservedLeaveDays.employeeId, employeeId))
      .execute();
  }

  async findOne(id: string) {
    const [reservedDay] = await this.db
      .select()
      .from(reservedLeaveDays)
      .where(eq(reservedLeaveDays.id, id))
      .execute();

    if (!reservedDay) {
      throw new BadRequestException('Reserved day not found');
    }
    return reservedDay;
  }

  async update(id: string, dto: UpdateReservedDayDto, user: User) {
    // Check if the date is already reserved
    await this.findOne(id);
    const reservedDay = this.db
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

    // Log the update of the reserved day
    await this.auditService.logAction({
      action: 'update',
      entity: 'reservedLeaveDays',
      entityId: reservedDay[0].id,
      userId: user.id, // Assuming you have a userId in the DTO
      details: 'Reserved day updated',
      changes: JSON.stringify(dto),
    });

    return reservedDay;
  }

  async remove(id: string) {
    return this.db
      .delete(reservedLeaveDays)
      .where(eq(reservedLeaveDays.id, id))
      .execute();
  }
}
