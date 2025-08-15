import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateClockInOutDto } from './dto/create-clock-in-out.dto';
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
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ClockInOutService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly employeesService: EmployeesService,
    private readonly attendanceSettingsService: AttendanceSettingsService,
    private readonly employeeShiftsService: EmployeeShiftsService,
    private readonly reportService: ReportService,
    private readonly cache: CacheService,
  ) {}

  /** tag family for invalidations */
  private tags(companyId: string) {
    return [
      `company:${companyId}:attendance`,
      `company:${companyId}:attendance:records`,
      `company:${companyId}:attendance:dashboards`,
    ];
  }

  /** Haversine helper */
  private isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusInKm = 0.1,
  ) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusInKm;
  }

  /** Location checks with light caching of company locations */
  async checkLocation(latitude: string, longitude: string, employee: any) {
    if (!employee) throw new BadRequestException('Employee not found');

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (employee.locationId) {
      // cache: specific location lookup
      const officeLocation = await this.cache.getOrSetVersioned(
        employee.companyId,
        ['attendance', 'locations', 'one', employee.locationId],
        async () => {
          const [loc] = await this.db
            .select()
            .from(companyLocations)
            .where(eq(companyLocations.id, employee.locationId))
            .execute();
          return loc ?? null;
        },
        { ttlSeconds: 60 * 5, tags: this.tags(employee.companyId) },
      );

      if (!officeLocation) {
        throw new BadRequestException('Assigned office location not found');
      }

      const ok = this.isWithinRadius(
        lat,
        lon,
        Number(officeLocation.latitude),
        Number(officeLocation.longitude),
        0.1,
      );
      if (!ok) {
        throw new BadRequestException(
          'You are not at your assigned office location.',
        );
      }
    } else {
      // cache: all company locations
      const officeLocations = await this.cache.getOrSetVersioned(
        employee.companyId,
        ['attendance', 'locations', 'all'],
        async () => {
          return this.db
            .select()
            .from(companyLocations)
            .where(eq(companyLocations.companyId, employee.companyId))
            .execute();
        },
        { ttlSeconds: 60 * 5, tags: this.tags(employee.companyId) },
      );

      const ok = officeLocations.some((loc) =>
        this.isWithinRadius(
          lat,
          lon,
          Number(loc.latitude),
          Number(loc.longitude),
          0.1,
        ),
      );
      if (!ok) {
        throw new BadRequestException(
          'You are not at a valid company location.',
        );
      }
    }
  }

  async clockIn(user: User, dto: CreateClockInOutDto) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const currentDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);
    const forceClockIn = dto.forceClockIn ?? false;

    // Already clocked in today?
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

    // Validate location (uses cache)
    await this.checkLocation(dto.latitude, dto.longitude, employee);

    // Settings (your settings service may already cache; if not, consider wrapping it there)
    const attendanceSettings =
      await this.attendanceSettingsService.getAllAttendanceSettings(
        user.companyId,
      );
    const useShifts = attendanceSettings['use_shifts'] ?? false;
    const earlyClockInMinutes = parseInt(
      attendanceSettings['early_clockIn_window_minutes'] ?? '15',
    );

    if (useShifts) {
      const assignedShift =
        await this.employeeShiftsService.getActiveShiftForEmployee(
          employee.id,
          user.companyId,
          currentDate,
        );

      if (!assignedShift && !forceClockIn) {
        throw new BadRequestException(
          'You do not have an active shift assigned today.',
        );
      }

      if (assignedShift && !assignedShift.allowEarlyClockIn) {
        const shiftStartTime = new Date(
          `${currentDate}T${assignedShift.startTime}`,
        );
        if (now < shiftStartTime && !forceClockIn) {
          throw new BadRequestException(
            'You cannot clock in before your shift start time.',
          );
        }
      } else if (assignedShift && assignedShift.allowEarlyClockIn) {
        const shiftStartTime = new Date(
          `${currentDate}T${assignedShift.startTime}`,
        );
        const earliestAllowedClockIn = new Date(
          shiftStartTime.getTime() -
            (assignedShift.earlyClockInMinutes ?? 0) * 60000,
        );
        if (now < earliestAllowedClockIn && !forceClockIn) {
          throw new BadRequestException(
            'You are clocking in too early according to your shift rules.',
          );
        }
      }
    } else {
      const startTime = attendanceSettings['default_start_time'] ?? '09:00';
      const earliestAllowed = new Date(`${currentDate}T${startTime}:00`);
      earliestAllowed.setMinutes(
        earliestAllowed.getMinutes() - earlyClockInMinutes,
      );
      if (now < earliestAllowed && !forceClockIn) {
        throw new BadRequestException('You are clocking in too early.');
      }
    }

    // Persist
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

    // Invalidate all attendance caches for this company
    await this.cache.bumpCompanyVersion(user.companyId);

    return 'Clocked in successfully.';
  }

  async clockOut(user: User, latitude: string, longitude: string) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const currentDate = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);

    // Fetch today's attendance record
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

    if (!attendance)
      throw new BadRequestException('You have not clocked in today.');
    if (attendance.clockOut)
      throw new BadRequestException('You have already clocked out.');

    // Validate location (uses cache)
    await this.checkLocation(latitude, longitude, employee);

    const checkInTime = new Date(attendance.clockIn);
    const workedMilliseconds = now.getTime() - checkInTime.getTime();
    const workDurationMinutes = Math.floor(workedMilliseconds / 60000);

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

    // Invalidate caches
    await this.cache.bumpCompanyVersion(user.companyId);

    return 'Clocked out successfully.';
  }

  async getAttendanceStatus(employeeId: string, companyId: string) {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);

    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'status', employeeId, today],
      async () => {
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

        if (!attendance) return { status: 'absent' as const };

        const checkInTime = attendance.clockIn;
        const checkOutTime = attendance.clockOut ?? null;
        return {
          status: 'present' as const,
          checkInTime,
          checkOutTime,
        };
      },
    );
  }

  async getDailyDashboardStats(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'dashboard', 'daily'],
      async () => {
        const summary =
          await this.reportService.getDailyAttendanceSummary(companyId);
        const { details, summaryList, metrics, dashboard } = summary;
        return {
          details,
          summaryList,
          metrics,
          ...dashboard,
        };
      },
    );
  }

  async getDailyDashboardStatsByDate(companyId: string, date: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'dashboard', 'daily', date],
      async () => {
        const summary = await this.reportService.getDailySummaryList(
          companyId,
          date,
        );
        return { summaryList: summary };
      },
    );
  }

  async getMonthlyDashboardStats(companyId: string, yearMonth: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'dashboard', 'monthly', yearMonth],
      async () => {
        const detailed = await this.reportService.getMonthlyAttendanceSummary(
          companyId,
          yearMonth,
        );

        const totalEmployees = detailed.length;
        const [y, m] = yearMonth.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();

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
          avgLatePerEmployee: +(
            sums.late / Math.max(totalEmployees, 1)
          ).toFixed(2),
          avgAbsentPerEmployee: +(
            sums.absent / Math.max(totalEmployees, 1)
          ).toFixed(2),
        };
      },
    );
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
    const startOfDay = new Date(`${target}T00:00:00.000Z`);
    const endOfDay = new Date(`${target}T23:59:59.999Z`);

    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee', employeeId, 'by-date', target],
      async () => {
        const s =
          await this.attendanceSettingsService.getAllAttendanceSettings(
            companyId,
          );
        const useShifts = s['use_shifts'] ?? false;
        const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
        const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);

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

        // determine scheduled start
        let startTimeStr = defaultStartTimeStr;
        let tolerance = lateToleranceMins;
        let endTimeStr = s['default_end_time'] ?? '17:00';

        if (useShifts) {
          const shift =
            await this.employeeShiftsService.getActiveShiftForEmployee(
              employeeId,
              companyId,
              target,
            );
          if (shift) {
            startTimeStr = shift.startTime;
            endTimeStr = shift.endTime;
            tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
          }
        }

        const shiftStart = parseISO(`${target}T${startTimeStr}:00`);
        const shiftEnd = parseISO(`${target}T${endTimeStr}:00`);
        const checkIn = new Date(rec.clockIn);
        const checkOut = rec.clockOut ? new Date(rec.clockOut) : null;
        const diffLate = (checkIn.getTime() - shiftStart.getTime()) / 60000;

        const isLateArrival = diffLate > tolerance;
        const isEarlyDeparture = checkOut
          ? checkOut.getTime() < shiftEnd.getTime()
          : false;

        return {
          date: target,
          checkInTime: checkIn.toTimeString().slice(0, 8),
          checkOutTime: checkOut?.toTimeString().slice(0, 8) ?? null,
          status: checkIn ? (isLateArrival ? 'late' : 'present') : 'absent',
          workDurationMinutes: rec.workDurationMinutes,
          overtimeMinutes: rec.overtimeMinutes ?? 0,
          isLateArrival,
          isEarlyDeparture,
        };
      },
    );
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
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee', employeeId, 'by-month', yearMonth],
      async () => {
        const [y, m] = yearMonth.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m - 1, new Date(y, m, 0).getDate());

        const allDays = eachDayOfInterval({ start, end }).map((d) =>
          format(d, 'yyyy-MM-dd'),
        );
        const todayStr = new Date().toISOString().split('T')[0];
        const days = allDays.filter((d) => d <= todayStr);

        // Reuse the per-day cached helper (fast after first call)
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

        return { summaryList: summaryList.reverse() };
      },
    );
  }

  async adjustAttendanceRecord(
    dto: AdjustAttendanceDto,
    attendanceRecordId: string,
    user: User,
    ip: string,
  ) {
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

    const [attendanceRecord] = await this.db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.id, attendanceRecordId))
      .execute();

    if (!attendanceRecord) {
      throw new BadRequestException('Attendance record not found.');
    }

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

    // Invalidate
    await this.cache.bumpCompanyVersion(user.companyId);

    return 'Attendance record adjusted successfully.';
  }
}
