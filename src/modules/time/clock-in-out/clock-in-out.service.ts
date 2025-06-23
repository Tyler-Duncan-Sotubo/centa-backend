import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateClockInOutDto } from './dto/create-clock-in-out.dto';
// import { UpdateClockInOutDto } from './dto/update-clock-in-out.dto';
import {
  attendanceAdjustments,
  attendanceRecords,
  companyLocations,
} from 'src/drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { AttendanceSettingsService } from '../settings/attendance-settings.service';
import { EmployeeShiftsService } from '../employee-shifts/employee-shifts.service';
import { User } from 'src/common/types/user.type';
import { ReportService } from '../report/report.service';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';

@Injectable()
export class ClockInOutService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly employeesService: EmployeesService,
    private readonly attendanceSettingsService: AttendanceSettingsService,
    private readonly employeeShiftsService: EmployeeShiftsService,
    private readonly reportService: ReportService,
  ) {}

  async checkLocation(latitude: string, longitude: string, employee: any) {
    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    if (employee.locationId) {
      // Employee assigned to specific location — fetch that
      const [officeLocation] = await this.db
        .select()
        .from(companyLocations)
        .where(eq(companyLocations.id, employee.locationId))
        .execute();

      if (!officeLocation) {
        throw new BadRequestException('Assigned office location not found');
      }

      const isInside = this.isWithinRadius(
        Number(latitude),
        Number(longitude),
        Number(officeLocation.latitude),
        Number(officeLocation.longitude),
        0.1, // ~100 meters
      );

      if (!isInside) {
        throw new BadRequestException(
          'You are not at your assigned office location.',
        );
      }
    } else {
      // No assigned location — check against any company location
      const officeLocations = await this.db
        .select()
        .from(companyLocations)
        .where(eq(companyLocations.companyId, employee.companyId))
        .execute();

      const isInsideAny = officeLocations.some((loc) =>
        this.isWithinRadius(
          Number(latitude),
          Number(longitude),
          Number(loc.latitude),
          Number(loc.longitude),
          0.1, // ~100 meters
        ),
      );

      if (!isInsideAny) {
        throw new BadRequestException(
          'You are not at a valid company location.',
        );
      }
    }
  }

  /**
   * Helper to calculate distance between two lat/lon points
   * using the Haversine formula
   */
  private isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusInKm = 0.1, // 100 meters
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;

    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km

    return distance <= radiusInKm;
  }

  async clockIn(user: User, dto: CreateClockInOutDto) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const currentDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);
    const forceClockIn = dto.forceClockIn ?? false;

    // 1. Check already clocked in
    const existingAttendance = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.companyId, user.companyId),
          gte(attendanceRecords.clockIn, startOfDay),
          lte(attendanceRecords.clockIn, endOfDay),
        ),
      )
      .execute();

    if (existingAttendance.length > 0) {
      throw new BadRequestException('You have already clocked in today.');
    }

    // 2. Validate location
    await this.checkLocation(dto.latitude, dto.longitude, employee);

    // 3. Load attendance settings once
    const attendanceSettings =
      await this.attendanceSettingsService.getAllAttendanceSettings(
        user.companyId,
      );
    const useShifts = attendanceSettings['use_shifts'] ?? false;
    const earlyClockInMinutes = parseInt(
      attendanceSettings['early_clockIn_window_minutes'] ?? '15',
    );

    // 4. If shifts are enabled, validate earliest clock-in
    if (useShifts) {
      const assignedShift =
        await this.employeeShiftsService.getActiveShiftForEmployee(
          employee.id,
          user.companyId,
          currentDate,
        );

      if (!assignedShift) {
        if (!forceClockIn) {
          throw new BadRequestException(
            'You do not have an active shift assigned today.',
          );
        }
      }

      if (assignedShift && !assignedShift.allowEarlyClockIn) {
        const shiftStartTime = new Date(
          `${currentDate}T${assignedShift.startTime}`,
        );
        if (now < shiftStartTime) {
          if (!forceClockIn) {
            throw new BadRequestException(
              'You cannot clock in before your shift start time.',
            );
          }
        }
      } else if (assignedShift && assignedShift.allowEarlyClockIn) {
        const shiftStartTime = new Date(
          `${currentDate}T${assignedShift.startTime}`,
        );
        const earliestAllowedClockIn = new Date(
          shiftStartTime.getTime() -
            (assignedShift.earlyClockInMinutes ?? 0) * 60000,
        );

        if (now < earliestAllowedClockIn) {
          if (!forceClockIn) {
            throw new BadRequestException(
              'You are clocking in too early according to your shift rules.',
            );
          }
          // forceClockIn true, allow to continue
        }
      }
    } else {
      // fallback to default
      const startTime = attendanceSettings['default_start_time'] ?? '09:00';
      const earliestAllowed = new Date(`${currentDate}T${startTime}:00`);
      earliestAllowed.setMinutes(
        earliestAllowed.getMinutes() - earlyClockInMinutes,
      );

      if (now < earliestAllowed) {
        if (!forceClockIn) {
          throw new BadRequestException('You are clocking in too early.');
        }
      }
    }

    // 5. Save clock-in record
    await this.db
      .insert(attendanceRecords)
      .values({
        companyId: user.companyId,
        employeeId: employee.id,
        clockIn: now,
        createdAt: now,
        updatedAt: now,
      })
      .execute();

    return 'Clocked in successfully.';
  }

  async clockOut(user: User, latitude: string, longitude: string) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const currentDate = new Date().toISOString().split('T')[0];
    const now = new Date();

    const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);

    // 1. Fetch clock-in record
    const [attendance] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.companyId, user.companyId),
          gte(attendanceRecords.clockIn, startOfDay),
          lte(attendanceRecords.clockIn, endOfDay),
        ),
      )
      .execute();

    if (!attendance) {
      throw new BadRequestException('You have not clocked in today.');
    }

    if (attendance.clockOut) {
      throw new BadRequestException('You have already clocked out.');
    }

    // 2. Validate location
    await this.checkLocation(latitude, longitude, employee);

    const checkInTime = new Date(attendance.clockIn);
    const workedMilliseconds = now.getTime() - checkInTime.getTime();
    const workDurationMinutes = Math.floor(workedMilliseconds / 60000);

    // 3. Load attendance settings once
    const attendanceSettings =
      await this.attendanceSettingsService.getAllAttendanceSettings(
        user.companyId,
      );
    const useShifts = attendanceSettings['use_shifts'] ?? false;

    let isLateArrival = false;
    let isEarlyDeparture = false;
    let overtimeMinutes = 0;

    if (useShifts) {
      const assignedShift =
        await this.employeeShiftsService.getActiveShiftForEmployee(
          employee.id,
          user.companyId,
          currentDate,
        );
      if (assignedShift) {
        const shiftStart = new Date(
          `${currentDate}T${assignedShift.startTime}`,
        );
        const shiftEnd = new Date(`${currentDate}T${assignedShift.endTime}`);

        const lateTolerance = assignedShift.lateToleranceMinutes ?? 10;

        if (
          checkInTime.getTime() >
          shiftStart.getTime() + lateTolerance * 60000
        ) {
          isLateArrival = true;
        }

        if (now.getTime() < shiftEnd.getTime()) {
          isEarlyDeparture = true;
        }

        if (now.getTime() > shiftEnd.getTime()) {
          overtimeMinutes = Math.floor(
            (now.getTime() - shiftEnd.getTime()) / 60000,
          );
        }
      }
    } else {
      // fallback to default rules
      const startTime = attendanceSettings['default_start_time'] ?? '09:00';
      const endTime = attendanceSettings['default_end_time'] ?? '17:00';
      const lateTolerance = parseInt(
        attendanceSettings['late_tolerance_minutes'] ?? '10',
      );

      const startDateTime = new Date(`${currentDate}T${startTime}:00`);
      const endDateTime = new Date(`${currentDate}T${endTime}:00`);

      if (
        checkInTime.getTime() >
        startDateTime.getTime() + lateTolerance * 60000
      ) {
        isLateArrival = true;
      }

      if (now.getTime() < endDateTime.getTime()) {
        isEarlyDeparture = true;
      }

      if (now.getTime() > endDateTime.getTime()) {
        overtimeMinutes = Math.floor(
          (now.getTime() - endDateTime.getTime()) / 60000,
        );
      }
    }

    // 4. Update attendance record
    await this.db
      .update(attendanceRecords)
      .set({
        clockOut: now,
        workDurationMinutes,
        overtimeMinutes: overtimeMinutes ?? 0,
        isLateArrival,
        isEarlyDeparture,
        updatedAt: now,
      })
      .where(eq(attendanceRecords.id, attendance.id))
      .execute();

    return 'Clocked out successfully.';
  }

  async getAttendanceStatus(employeeId: string, companyId: string) {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);

    // Fetch today's attendance record
    const [attendance] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfDay),
          lte(attendanceRecords.clockIn, endOfDay),
        ),
      )
      .execute();

    if (!attendance) {
      return { status: 'absent' };
    }

    const checkInTime = attendance.clockIn;
    const checkOutTime = attendance.clockOut;

    if (checkOutTime) {
      return { status: 'present', checkInTime, checkOutTime };
    } else {
      return { status: 'present', checkInTime, checkOutTime: null };
    }
  }

  async getDailyDashboardStats(companyId: string) {
    const summary =
      await this.reportService.getDailyAttendanceSummary(companyId);
    const { details, summaryList, metrics, dashboard } = summary;
    return {
      details,
      summaryList,
      metrics,
      ...dashboard,
    };
  }

  async getDailyDashboardStatsByDate(companyId: string, date: string) {
    const summary = await this.reportService.getDailySummaryList(
      companyId,
      date,
    );

    return {
      summaryList: summary,
    };
  }

  async getMonthlyDashboardStats(companyId: string, yearMonth: string) {
    const detailed = await this.reportService.getMonthlyAttendanceSummary(
      companyId,
      yearMonth,
    );

    const totalEmployees = detailed.length;
    const daysInMonth = yearMonth
      .split('-')
      .map(Number)
      .reduce(
        (_, m) => new Date(Number(yearMonth.split('-')[0]), m, 0).getDate(),
        0,
      );

    const sums = detailed.reduce(
      (acc, r) => {
        acc.present += r.present;
        acc.late += r.late;
        acc.absent += r.absent;
        return acc;
      },
      { present: 0, late: 0, absent: 0 },
    );

    const attendanceRate =
      (
        ((sums.present + sums.late) / (totalEmployees * daysInMonth)) *
        100
      ).toFixed(2) + '%';

    return {
      month: yearMonth,
      totalEmployees,
      attendanceRate,
      avgLatePerEmployee: +(sums.late / totalEmployees).toFixed(2),
      avgAbsentPerEmployee: +(sums.absent / totalEmployees).toFixed(2),
    };
  }

  /** ESS: fetch one employee’s attendance on a specific date */
  async getEmployeeAttendanceByDate(
    employeeId: string,
    companyId: string,
    date: string, // "YYYY-MM-DD"
  ): Promise<{
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: 'absent' | 'present' | 'late';
    workDurationMinutes: number | null;
    overtimeMinutes: number;
    isLateArrival: boolean;
    isEarlyDeparture: boolean;
  }> {
    const target = new Date(date).toISOString().split('T')[0];
    // compute day bounds
    const startOfDay = new Date(`${target}T00:00:00.000Z`);
    const endOfDay = new Date(`${target}T23:59:59.999Z`);

    // load settings
    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
    const useShifts = s['use_shifts'] ?? false;
    const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
    const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);

    // fetch this employee’s attendance record for that date
    const recs = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfDay),
          lte(attendanceRecords.clockIn, endOfDay),
        ),
      )
      .execute();

    const rec = recs[0] ?? null;
    if (!rec) {
      return {
        date: target,
        checkInTime: null,
        checkOutTime: null,
        status: 'absent',
        workDurationMinutes: null,
        overtimeMinutes: 0,
        isLateArrival: false,
        isEarlyDeparture: false,
      };
    }

    // determine scheduled start for lateness check
    let startTimeStr = defaultStartTimeStr;
    let tolerance = lateToleranceMins;
    if (useShifts) {
      const shift = await this.employeeShiftsService.getActiveShiftForEmployee(
        employeeId,
        companyId,
        target,
      );
      if (shift) {
        startTimeStr = shift.startTime;
        tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
      }
    }

    const shiftStart = parseISO(`${target}T${startTimeStr}:00`);
    const checkIn = new Date(rec.clockIn);
    const checkOut = rec.clockOut ? new Date(rec.clockOut) : null;
    const diffLate = (checkIn.getTime() - shiftStart.getTime()) / 60000;

    const isLateArrival = diffLate > tolerance;
    const isEarlyDeparture = checkOut
      ? checkOut.getTime() <
        parseISO(
          `${target}T${(useShifts && (await this.employeeShiftsService.getActiveShiftForEmployee(employeeId, companyId, target)))?.end_time ?? s['default_end_time'] ?? '17:00'}:00`,
        ).getTime()
      : false;

    const workDurationMinutes = rec.workDurationMinutes;
    const overtimeMinutes = rec.overtimeMinutes;

    return {
      date: target,
      checkInTime: checkIn.toTimeString().slice(0, 8),
      checkOutTime: checkOut?.toTimeString().slice(0, 8) ?? null,
      status: checkIn ? (isLateArrival ? 'late' : 'present') : 'absent',
      workDurationMinutes,
      overtimeMinutes: overtimeMinutes ?? 0,
      isLateArrival,
      isEarlyDeparture,
    };
  }

  /** ESS: fetch one employee’s attendance day-by-day for a month */
  async getEmployeeAttendanceByMonth(
    employeeId: string,
    companyId: string,
    yearMonth: string, // "YYYY-MM"
  ): Promise<{
    summaryList: Array<{
      date: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      status: 'absent' | 'present' | 'late';
    }>;
  }> {
    // compute month range
    const [y, m] = yearMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m - 1, new Date(y, m, 0).getDate());

    const startOfMonth = new Date(start);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(end);
    endOfMonth.setHours(23, 59, 59, 999);

    // fetch all this employee's records for the month
    const recs = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfMonth),
          lte(attendanceRecords.clockIn, endOfMonth),
        ),
      )
      .execute();

    // map by dayKey "YYYY-MM-DD"
    const map = new Map<string, (typeof recs)[0]>();
    for (const r of recs) {
      const day = r.clockIn.toISOString().split('T')[0];
      map.set(day, r);
    }

    // 1) build all days in the month
    const allDays = eachDayOfInterval({ start, end }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );

    // 2) filter out any future dates
    const todayStr = new Date().toISOString().split('T')[0];
    const days = allDays.filter((dateKey) => dateKey <= todayStr);
    const summaryList = await Promise.all(
      days.map(async (dateKey) => {
        const day = await this.getEmployeeAttendanceByDate(
          employeeId,
          companyId,
          dateKey,
        );
        return {
          date: dateKey,
          checkInTime: day.checkInTime,
          checkOutTime: day.checkOutTime,
          status: day.status,
        };
      }),
    );

    return { summaryList: summaryList.reverse() }; // reverse to show latest first
  }

  async adjustAttendanceRecord(
    dto: AdjustAttendanceDto,
    attendanceRecordId: string,
    user: User,
    ip: string,
  ) {
    // 1. Insert into attendance_adjustments table
    await this.db
      .insert(attendanceAdjustments)
      .values({
        attendanceRecordId: attendanceRecordId,
        adjustedClockIn: dto.adjustedClockIn
          ? new Date(dto.adjustedClockIn)
          : null,
        adjustedClockOut: dto.adjustedClockOut
          ? new Date(dto.adjustedClockOut)
          : null,
        reason: dto.reason,
        approvedBy: user.id,
        createdAt: new Date(),
      })
      .execute();

    // Fetch the original attendance record
    const [attendanceRecord] = await this.db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, attendanceRecordId))
      .execute();

    if (!attendanceRecord) {
      throw new BadRequestException('Attendance record not found.');
    }

    // 2a. Update the main attendance record
    await this.db
      .update(attendanceRecords)
      .set({
        clockIn: dto.adjustedClockIn
          ? new Date(dto.adjustedClockIn)
          : attendanceRecords.clockIn,
        clockOut: dto.adjustedClockOut
          ? new Date(dto.adjustedClockOut)
          : attendanceRecords.clockOut,
      })
      .where(eq(attendanceRecords.id, attendanceRecordId))
      .execute();

    // 3. Log the audit trail
    await this.auditService.logAction({
      action: 'update',
      entity: 'Attendance',
      userId: user.id,
      ipAddress: ip,
      entityId: attendanceRecordId,
      details: 'Adjusted attendance record',
      changes: {
        attendanceRecordId,
        adjustedClockIn: dto.adjustedClockIn,
        adjustedClockOut: dto.adjustedClockOut,
        reason: dto.reason,
        approvedBy: user.id,
      },
    });

    // 4. Return the updated attendance record
    return 'Attendance record adjusted successfully.';
  }
}
