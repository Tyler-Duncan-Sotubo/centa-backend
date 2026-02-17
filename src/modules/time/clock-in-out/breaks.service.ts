// src/modules/attendance/breaks/breaks.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lte, isNull } from 'drizzle-orm';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { attendanceBreaks, attendanceRecords } from 'src/drizzle/schema';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { CacheService } from 'src/common/cache/cache.service';
import { User } from 'src/common/types/user.type';
import { AttendanceLocationService } from './attendance-location.service';

@Injectable()
export class BreaksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly employeesService: EmployeesService,
    private readonly cache: CacheService,
    private readonly location: AttendanceLocationService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:attendance`,
      `company:${companyId}:attendance:records`,
      `company:${companyId}:attendance:dashboards`,
    ];
  }

  private getTodayWindow(tz: string) {
    const localDate = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
    const startOfDayUtc = fromZonedTime(`${localDate}T00:00:00.000`, tz);
    const endOfDayUtc = fromZonedTime(`${localDate}T23:59:59.999`, tz);
    return { localDate, startOfDayUtc, endOfDayUtc };
  }

  private async getTodayAttendance(
    employeeId: string,
    companyId: string,
    tz: string,
  ) {
    const { startOfDayUtc, endOfDayUtc } = this.getTodayWindow(tz);

    const [attendance] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfDayUtc),
          lte(attendanceRecords.clockIn, endOfDayUtc),
        ),
      )
      .limit(1)
      .execute();

    return attendance;
  }

  async startBreak(
    user: User,
    latitude: string,
    longitude: string,
    tz?: string,
  ) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const zone = this.location.pickTz(tz ?? 'Africa/Lagos');

    const attendance = await this.getTodayAttendance(
      employee.id,
      user.companyId,
      zone,
    );
    if (!attendance)
      throw new BadRequestException('You have not clocked in today.');
    if (attendance.clockOut)
      throw new BadRequestException('You have already clocked out.');

    await this.location.checkLocation(latitude, longitude, employee);

    const [open] = await this.db
      .select({ id: attendanceBreaks.id })
      .from(attendanceBreaks)
      .where(
        and(
          eq(attendanceBreaks.companyId, user.companyId),
          eq(attendanceBreaks.attendanceRecordId, attendance.id),
          isNull(attendanceBreaks.breakEnd),
        ),
      )
      .limit(1)
      .execute();

    if (open) throw new BadRequestException('You are already on a break.');

    const now = new Date();

    await this.db
      .insert(attendanceBreaks)
      .values({
        companyId: user.companyId,
        attendanceRecordId: attendance.id,
        breakStart: now,
        breakEnd: null,
        durationMinutes: null,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    await this.cache.bumpCompanyVersion(user.companyId);
    return 'Break started.';
  }

  async endBreak(user: User, latitude: string, longitude: string, tz?: string) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const zone = this.location.pickTz(tz ?? 'Africa/Lagos');

    const attendance = await this.getTodayAttendance(
      employee.id,
      user.companyId,
      zone,
    );
    if (!attendance)
      throw new BadRequestException('You have not clocked in today.');
    if (attendance.clockOut)
      throw new BadRequestException('You have already clocked out.');

    await this.location.checkLocation(latitude, longitude, employee);

    const [open] = await this.db
      .select()
      .from(attendanceBreaks)
      .where(
        and(
          eq(attendanceBreaks.companyId, user.companyId),
          eq(attendanceBreaks.attendanceRecordId, attendance.id),
          isNull(attendanceBreaks.breakEnd),
        ),
      )
      .limit(1)
      .execute();

    if (!open)
      throw new BadRequestException('You are not currently on a break.');

    const now = new Date();
    const mins = Math.max(
      0,
      Math.floor((now.getTime() - new Date(open.breakStart).getTime()) / 60000),
    );

    await this.db
      .update(attendanceBreaks)
      .set({
        breakEnd: now,
        durationMinutes: mins,
        updatedAt: now,
      })
      .where(eq(attendanceBreaks.id, open.id))
      .execute();

    await this.cache.bumpCompanyVersion(user.companyId);
    return 'Break ended.';
  }

  async getBreakStatus(user: User, tz?: string) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const zone = this.location.pickTz(tz ?? 'Africa/Lagos');

    const attendance = await this.getTodayAttendance(
      employee.id,
      user.companyId,
      zone,
    );
    if (!attendance) return { onBreak: false, breakStart: null };

    const [open] = await this.db
      .select({ breakStart: attendanceBreaks.breakStart })
      .from(attendanceBreaks)
      .where(
        and(
          eq(attendanceBreaks.companyId, user.companyId),
          eq(attendanceBreaks.attendanceRecordId, attendance.id),
          isNull(attendanceBreaks.breakEnd),
        ),
      )
      .limit(1)
      .execute();

    return { onBreak: !!open, breakStart: open?.breakStart ?? null };
  }

  // optional helper for clockOut() service: compute total break minutes for record
  async getTotalBreakMinutes(companyId: string, attendanceRecordId: string) {
    const rows = await this.db
      .select({ durationMinutes: attendanceBreaks.durationMinutes })
      .from(attendanceBreaks)
      .where(
        and(
          eq(attendanceBreaks.companyId, companyId),
          eq(attendanceBreaks.attendanceRecordId, attendanceRecordId),
        ),
      )
      .execute();

    return rows.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
  }
}
