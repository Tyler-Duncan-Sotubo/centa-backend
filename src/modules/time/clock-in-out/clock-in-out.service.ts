import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
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
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ClockInOutService.name);
  }

  // ---------- cache keys & version bump helpers ----------
  private statusKey(companyId: string, employeeId: string, date: string) {
    return `company:${companyId}:attendance:status:${employeeId}:${date}`;
  }
  private monthKey(companyId: string, employeeId: string, ym: string) {
    return `company:${companyId}:attendance:month:${employeeId}:${ym}`;
  }
  private todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  private async bumpAttendanceVersion(companyId: string) {
    try {
      await this.cache.set(
        `attendance:ver:${companyId}`,
        Date.now().toString(),
      );
      this.logger.debug({ companyId }, 'attendance:version-bumped');
    } catch (e) {
      this.logger.warn(
        { companyId, err: (e as Error)?.message },
        'attendance:version-bump-failed',
      );
    }
  }
  private async burstEmployeeDayCache(
    companyId: string,
    employeeId: string,
    date: string,
  ) {
    const key = this.statusKey(companyId, employeeId, date);
    await this.cache.del(key);
    this.logger.debug({ key }, 'cache:del:status');
  }
  private async burstEmployeeMonthCache(
    companyId: string,
    employeeId: string,
    yearMonth: string,
  ) {
    const key = this.monthKey(companyId, employeeId, yearMonth);
    await this.cache.del(key);
    this.logger.debug({ key }, 'cache:del:month');
  }

  // ---------- location helper ----------
  async checkLocation(latitude: string, longitude: string, employee: any) {
    this.logger.debug(
      {
        employeeId: employee?.id,
        lat: latitude,
        lon: longitude,
        hasLocation: !!employee?.locationId,
      },
      'checkLocation:start',
    );

    if (!employee) {
      throw new BadRequestException('Employee not found');
    }

    if (employee.locationId) {
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

      this.logger.debug(
        { officeLocationId: officeLocation.id, isInside },
        'checkLocation:assigned-result',
      );

      if (!isInside) {
        throw new BadRequestException(
          'You are not at your assigned office location.',
        );
      }
    } else {
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
          0.1,
        ),
      );

      this.logger.debug(
        { locations: officeLocations.length, isInsideAny },
        'checkLocation:any-result',
      );

      if (!isInsideAny) {
        throw new BadRequestException(
          'You are not at a valid company location.',
        );
      }
    }
  }

  /**
   * Haversine distance
   */
  private isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusInKm = 0.1,
  ) {
    const toRad = (value: number) => (value * Math.PI) / 180;

    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusInKm;
  }

  // ---------- clock in ----------
  async clockIn(user: User, dto: CreateClockInOutDto) {
    this.logger.info(
      { userId: user.id, companyId: user.companyId },
      'clockIn:start',
    );

    const employee = await this.employeesService.findOneByUserId(user);
    const currentDate = this.todayISO();
    const now = new Date();
    const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);
    const forceClockIn = dto.forceClockIn ?? false;

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
      this.logger.warn(
        { employeeId: employee.id },
        'clockIn:already-clocked-in',
      );
      throw new BadRequestException('You have already clocked in today.');
    }

    await this.checkLocation(dto.latitude, dto.longitude, employee);

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
        this.logger.warn(
          { employeeId: employee.id, currentDate },
          'clockIn:no-active-shift',
        );
        throw new BadRequestException(
          'You do not have an active shift assigned today.',
        );
      }

      if (assignedShift && !assignedShift.allowEarlyClockIn) {
        const shiftStartTime = new Date(
          `${currentDate}T${assignedShift.startTime}`,
        );
        if (now < shiftStartTime && !forceClockIn) {
          this.logger.warn(
            { employeeId: employee.id, shiftStart: assignedShift.startTime },
            'clockIn:too-early-no-earlyClockIn',
          );
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
          this.logger.warn(
            {
              employeeId: employee.id,
              earliest: earliestAllowedClockIn.toISOString(),
            },
            'clockIn:too-early-with-earlyClockIn',
          );
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
        this.logger.warn(
          { employeeId: employee.id, earliest: earliestAllowed.toISOString() },
          'clockIn:too-early-default',
        );
        throw new BadRequestException('You are clocking in too early.');
      }
    }

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

    // cache: burst per-employee/day & bump global version
    await Promise.all([
      this.burstEmployeeDayCache(user.companyId, employee.id, currentDate),
      this.burstEmployeeMonthCache(
        user.companyId,
        employee.id,
        currentDate.slice(0, 7),
      ),
      this.bumpAttendanceVersion(user.companyId),
    ]);

    this.logger.info(
      { employeeId: employee.id, clockIn: now.toISOString() },
      'clockIn:done',
    );
    return 'Clocked in successfully.';
  }

  // ---------- clock out ----------
  async clockOut(user: User, latitude: string, longitude: string) {
    this.logger.info(
      { userId: user.id, companyId: user.companyId },
      'clockOut:start',
    );

    const employee = await this.employeesService.findOneByUserId(user);
    const currentDate = this.todayISO();
    const now = new Date();

    const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);

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
      this.logger.warn(
        { employeeId: employee.id },
        'clockOut:no-attendance-today',
      );
      throw new BadRequestException('You have not clocked in today.');
    }

    if (attendance.clockOut) {
      this.logger.warn(
        { employeeId: employee.id },
        'clockOut:already-clocked-out',
      );
      throw new BadRequestException('You have already clocked out.');
    }

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

    // cache: burst & bump version
    await Promise.all([
      this.burstEmployeeDayCache(user.companyId, employee.id, currentDate),
      this.burstEmployeeMonthCache(
        user.companyId,
        employee.id,
        currentDate.slice(0, 7),
      ),
      this.bumpAttendanceVersion(user.companyId),
    ]);

    this.logger.info(
      {
        employeeId: employee.id,
        clockOut: now.toISOString(),
        workDurationMinutes,
        overtimeMinutes,
        isLateArrival,
        isEarlyDeparture,
      },
      'clockOut:done',
    );
    return 'Clocked out successfully.';
  }

  // ---------- status (cached) ----------
  async getAttendanceStatus(employeeId: string, companyId: string) {
    const today = this.todayISO();
    const key = this.statusKey(companyId, employeeId, today);

    const cached = await this.cache.get(key);
    if (cached) {
      this.logger.debug({ key }, 'getAttendanceStatus:cache:hit');
      return cached;
    }
    this.logger.debug({ key }, 'getAttendanceStatus:cache:miss');

    const startOfDay = new Date(`${today}T00:00:00.000Z`);
    const endOfDay = new Date(`${today}T23:59:59.999Z`);

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

    let payload: any;
    if (!attendance) {
      payload = { status: 'absent' };
    } else {
      const checkInTime = attendance.clockIn;
      const checkOutTime = attendance.clockOut;
      payload = checkOutTime
        ? { status: 'present', checkInTime, checkOutTime }
        : { status: 'present', checkInTime, checkOutTime: null };
    }

    await this.cache.set(key, payload);
    return payload;
  }

  // ---------- dashboard (delegates to ReportService, which caches) ----------
  async getDailyDashboardStats(companyId: string) {
    this.logger.debug({ companyId }, 'getDailyDashboardStats:start');
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
    this.logger.debug({ companyId, date }, 'getDailyDashboardStatsByDate');
    const summary = await this.reportService.getDailySummaryList(
      companyId,
      date,
    );

    return {
      summaryList: summary,
    };
  }

  async getMonthlyDashboardStats(companyId: string, yearMonth: string) {
    this.logger.debug({ companyId, yearMonth }, 'getMonthlyDashboardStats');
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

  // ---------- ESS: one day (cached per employee/day) ----------
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
    const cacheKey = this.statusKey(companyId, employeeId, target);

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey }, 'getEmployeeAttendanceByDate:cache:hit');
      return cached;
    }
    this.logger.debug({ cacheKey }, 'getEmployeeAttendanceByDate:cache:miss');

    const startOfDay = new Date(`${target}T00:00:00.000Z`);
    const endOfDay = new Date(`${target}T23:59:59.999Z`);

    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
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
      const payload = {
        date: target,
        checkInTime: null,
        checkOutTime: null,
        status: 'absent' as const,
        workDurationMinutes: null,
        overtimeMinutes: 0,
        isLateArrival: false,
        isEarlyDeparture: false,
      };
      await this.cache.set(cacheKey, payload);
      return payload;
    }

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

    // compute early departure vs end time (shift or default)
    let endTimeStr = s['default_end_time'] ?? '17:00';
    if (useShifts) {
      const shift = await this.employeeShiftsService.getActiveShiftForEmployee(
        employeeId,
        companyId,
        target,
      );
      if (shift?.endTime) endTimeStr = shift.endTime;
    }
    const endDateTime = parseISO(`${target}T${endTimeStr}:00`);
    const isEarlyDeparture = checkOut
      ? checkOut.getTime() < endDateTime.getTime()
      : false;

    const payload = {
      date: target,
      checkInTime: checkIn.toTimeString().slice(0, 8),
      checkOutTime: checkOut?.toTimeString().slice(0, 8) ?? null,
      status: checkIn
        ? isLateArrival
          ? 'late'
          : 'present'
        : ('absent' as 'late' | 'present' | 'absent'),
      workDurationMinutes: rec.workDurationMinutes,
      overtimeMinutes: rec.overtimeMinutes ?? 0,
      isLateArrival,
      isEarlyDeparture,
    };

    await this.cache.set(cacheKey, payload);
    return payload;
  }

  // ---------- ESS: month view (cached per employee/month) ----------
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
    const [y, m] = yearMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m - 1, new Date(y, m, 0).getDate());

    const startOfMonth = new Date(start);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(end);
    endOfMonth.setHours(23, 59, 59, 999);

    const cacheKey = this.monthKey(companyId, employeeId, yearMonth);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug({ cacheKey }, 'getEmployeeAttendanceByMonth:cache:hit');
      return cached;
    }
    this.logger.debug({ cacheKey }, 'getEmployeeAttendanceByMonth:cache:miss');

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

    const map = new Map<string, (typeof recs)[0]>();
    for (const r of recs) {
      const day = r.clockIn.toISOString().split('T')[0];
      map.set(day, r);
    }

    const allDays = eachDayOfInterval({ start, end }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );

    const todayStr = this.todayISO();
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

    const payload = { summaryList: summaryList.reverse() };
    await this.cache.set(cacheKey, payload);
    return payload;
  }

  // ---------- adjust ----------
  async adjustAttendanceRecord(
    dto: AdjustAttendanceDto,
    attendanceRecordId: string,
    user: User,
    ip: string,
  ) {
    this.logger.info(
      { attendanceRecordId, userId: user.id, companyId: user.companyId },
      'adjustAttendance:start',
    );

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
      this.logger.warn({ attendanceRecordId }, 'adjustAttendance:not-found');
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

    // cache: burst (day & month) for the employee/date involved + bump version
    const affectedDate =
      (dto.adjustedClockIn ?? dto.adjustedClockOut ?? attendanceRecord.clockIn)
        ?.toString()
        ?.slice(0, 10) || attendanceRecord.clockIn.toISOString().slice(0, 10);
    await Promise.all([
      this.burstEmployeeDayCache(
        user.companyId,
        attendanceRecord.employeeId,
        affectedDate,
      ),
      this.burstEmployeeMonthCache(
        user.companyId,
        attendanceRecord.employeeId,
        affectedDate.slice(0, 7),
      ),
      this.bumpAttendanceVersion(user.companyId),
    ]);

    this.logger.info({ attendanceRecordId }, 'adjustAttendance:done');
    return 'Attendance record adjusted successfully.';
  }
}
