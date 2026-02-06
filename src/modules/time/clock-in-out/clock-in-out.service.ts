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
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';
import { CacheService } from 'src/common/cache/cache.service';

type DayStatus = 'absent' | 'present' | 'late';

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

  /** ---------- small helpers ---------- */
  private tags(companyId: string) {
    return [
      `company:${companyId}:attendance`,
      `company:${companyId}:attendance:records`,
      `company:${companyId}:attendance:dashboards`,
    ];
  }

  private pickTz(tz?: string): string {
    try {
      if (tz) {
        fromZonedTime('2000-01-01T00:00:00', tz);
        return tz;
      }
    } catch {}
    return process.env.DEFAULT_TZ || 'Africa/Lagos';
  }

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
    return R * c <= radiusInKm;
  }

  /** local yyyy-MM-dd + its UTC window for that timezone */
  private getTodayWindow(tz: string) {
    const localDate = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
    const startOfDayUtc = fromZonedTime(`${localDate}T00:00:00.000`, tz);
    const endOfDayUtc = fromZonedTime(`${localDate}T23:59:59.999`, tz);
    return { localDate, startOfDayUtc, endOfDayUtc };
  }

  /** per-request memo for settings (avoid multiple reads in same request) */
  private settingsMemo = new Map<string, Record<string, any>>();
  private async getSettings(companyId: string) {
    const cached = this.settingsMemo.get(companyId);
    if (cached) return cached;
    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
    this.settingsMemo.set(companyId, s);
    return s;
  }

  /** ---------- location checks (cached) ---------- */
  async checkLocation(latitude: string, longitude: string, employee: any) {
    if (!employee) throw new BadRequestException('Employee not found');

    const lat = Number(latitude);
    const lon = Number(longitude);

    // 1) Validate coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new BadRequestException('Invalid latitude/longitude provided.');
    }

    // 2) Enforce rule: every employee must have an assigned locationId
    if (!employee.locationId) {
      // This should never happen if your data is correct
      throw new BadRequestException(
        'No assigned office location for this employee. Please contact HR/admin.',
      );
    }

    // 3) Load ALL company locations once (cache) for:
    //    - verifying assigned location exists
    //    - fallback to any company location
    const officeLocations = await this.cache.getOrSetVersioned(
      employee.companyId,
      ['attendance', 'locations', 'all'],
      async () =>
        this.db
          .select()
          .from(companyLocations)
          .where(eq(companyLocations.companyId, employee.companyId))
          .execute(),
      { ttlSeconds: 300, tags: this.tags(employee.companyId) },
    );

    if (!officeLocations || officeLocations.length === 0) {
      throw new BadRequestException(
        'No company locations configured. Please contact admin.',
      );
    }

    // after you fetch officeLocations (all locations for the company)
    const activeLocations = officeLocations.filter((l) => l.isActive);

    const assigned = activeLocations.find((l) => l.id === employee.locationId);
    if (!assigned)
      throw new BadRequestException('Assigned office location not found.');

    const isWithin = (loc: any) =>
      this.isWithinRadius(
        lat,
        lon,
        Number(loc.latitude),
        Number(loc.longitude),
      );

    // 1) assigned location always allowed
    if (isWithin(assigned)) return;

    // 2) fallback ONLY to OFFICE locations (and active)
    const fallbackOffices = activeLocations.filter(
      (l) => l.locationType === 'OFFICE',
    );
    const okAnyOffice = fallbackOffices.some(isWithin);
    if (okAnyOffice) return;

    // short error
    throw new BadRequestException('You are not at a valid company location.');
  }

  /** ---------- clock in/out ---------- */
  async clockIn(user: User, dto: CreateClockInOutDto) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const tz = this.pickTz(dto.tz ?? 'Africa/Lagos');
    const now = new Date(); // UTC
    const { localDate, startOfDayUtc, endOfDayUtc } = this.getTodayWindow(tz);

    // check duplicate in local day
    const [existing] = await this.db
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.companyId, user.companyId),
          gte(attendanceRecords.clockIn, startOfDayUtc),
          lte(attendanceRecords.clockIn, endOfDayUtc),
        ),
      )
      .limit(1)
      .execute();

    if (existing)
      throw new BadRequestException('You have already clocked in today.');

    await this.checkLocation(dto.latitude, dto.longitude, employee);

    const settings = await this.getSettings(user.companyId);
    const useShifts = settings['use_shifts'] ?? false;
    const forceClockIn = dto.forceClockIn ?? false;

    if (useShifts) {
      const shift = await this.employeeShiftsService.getActiveShiftForEmployee(
        employee.id,
        user.companyId,
        localDate,
      );
      if (!shift && !forceClockIn) {
        throw new BadRequestException(
          'You do not have an active shift assigned today.',
        );
      }
      if (shift) {
        const shiftStartUtc = fromZonedTime(
          `${localDate}T${shift.startTime}`,
          tz,
        );
        if (shift.allowEarlyClockIn) {
          const earliest = new Date(
            shiftStartUtc.getTime() - (shift.earlyClockInMinutes ?? 0) * 60000,
          );
          if (now < earliest && !forceClockIn) {
            throw new BadRequestException('You are clocking in too early.');
          }
        } else if (now < shiftStartUtc && !forceClockIn) {
          throw new BadRequestException(
            'You cannot clock in before your shift start time.',
          );
        }
      }
    } else {
      const startTime = settings['default_start_time'] ?? '09:00';
      const earlyWindow = parseInt(
        settings['early_clockIn_window_minutes'] ?? '15',
        10,
      );
      const earliest = new Date(
        fromZonedTime(`${localDate}T${startTime}:00`, tz).getTime() -
          earlyWindow * 60000,
      );
      if (now < earliest && !forceClockIn) {
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

    await this.cache.bumpCompanyVersion(user.companyId);
    return 'Clocked in successfully.';
  }

  async clockOut(user: User, latitude: string, longitude: string, tz?: string) {
    const employee = await this.employeesService.findOneByUserId(user.id);
    const zone = this.pickTz(tz ?? 'Africa/Lagos');
    const { localDate, startOfDayUtc, endOfDayUtc } = this.getTodayWindow(zone);
    const now = new Date();

    const [attendance] = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employee.id),
          eq(attendanceRecords.companyId, user.companyId),
          gte(attendanceRecords.clockIn, startOfDayUtc),
          lte(attendanceRecords.clockIn, endOfDayUtc),
        ),
      )
      .limit(1)
      .execute();

    if (!attendance)
      throw new BadRequestException('You have not clocked in today.');
    if (attendance.clockOut)
      throw new BadRequestException('You have already clocked out.');

    await this.checkLocation(latitude, longitude, employee);

    const checkInTime = new Date(attendance.clockIn);
    const workDurationMinutes = Math.floor(
      (now.getTime() - checkInTime.getTime()) / 60000,
    );

    const s = await this.getSettings(user.companyId);
    const useShifts = s['use_shifts'] ?? false;

    let isLateArrival = false;
    let isEarlyDeparture = false;
    let overtimeMinutes = 0;

    if (useShifts) {
      const shift = await this.employeeShiftsService.getActiveShiftForEmployee(
        employee.id,
        user.companyId,
        localDate,
      );
      if (shift) {
        const shiftStartUtc = fromZonedTime(
          `${localDate}T${shift.startTime}`,
          zone,
        );
        const shiftEndUtc = fromZonedTime(
          `${localDate}T${shift.endTime}`,
          zone,
        );
        const tol = shift.lateToleranceMinutes ?? 10;

        if (checkInTime.getTime() > shiftStartUtc.getTime() + tol * 60000)
          isLateArrival = true;
        if (now.getTime() < shiftEndUtc.getTime()) isEarlyDeparture = true;
        if (now.getTime() > shiftEndUtc.getTime()) {
          overtimeMinutes = Math.floor(
            (now.getTime() - shiftEndUtc.getTime()) / 60000,
          );
        }
      }
    } else {
      const startTime = s['default_start_time'] ?? '09:00';
      const endTime = s['default_end_time'] ?? '17:00';
      const tol = parseInt(s['late_tolerance_minutes'] ?? '10', 10);

      const startUtc = fromZonedTime(`${localDate}T${startTime}:00`, zone);
      const endUtc = fromZonedTime(`${localDate}T${endTime}:00`, zone);

      if (checkInTime.getTime() > startUtc.getTime() + tol * 60000)
        isLateArrival = true;
      if (now.getTime() < endUtc.getTime()) isEarlyDeparture = true;
      if (now.getTime() > endUtc.getTime()) {
        overtimeMinutes = Math.floor(
          (now.getTime() - endUtc.getTime()) / 60000,
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

    await this.cache.bumpCompanyVersion(user.companyId);
    return 'Clocked out successfully.';
  }

  /** ---------- status & dashboards ---------- */
  async getAttendanceStatus(
    employeeId: string,
    companyId: string,
    tz?: string,
  ) {
    const zone = this.pickTz(tz ?? 'Africa/Lagos');
    const todayLocal = formatInTimeZone(new Date(), zone, 'yyyy-MM-dd');
    const startOfDayUtc = fromZonedTime(`${todayLocal}T00:00:00.000`, zone);
    const endOfDayUtc = fromZonedTime(`${todayLocal}T23:59:59.999`, zone);

    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'status', employeeId, todayLocal],
      async () => {
        const [attendance] = await this.db
          .select({
            clockIn: attendanceRecords.clockIn,
            clockOut: attendanceRecords.clockOut,
          })
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

        if (!attendance) return { status: 'absent' as const };
        return {
          status: 'present' as const,
          checkInTime: attendance.clockIn,
          checkOutTime: attendance.clockOut ?? null,
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
        console.log(metrics);
        return { details, summaryList, metrics, ...dashboard };
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
            ((sums.present + sums.late) /
              (Math.max(totalEmployees, 1) * daysInMonth)) *
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

  /** ---------- per-day (cached) ---------- */
  async getEmployeeAttendanceByDate(
    employeeId: string,
    companyId: string,
    date: string,
  ): Promise<{
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: DayStatus;
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
        const s = await this.getSettings(companyId);
        const useShifts = s['use_shifts'] ?? false;
        const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
        const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
        const endDefault = s['default_end_time'] ?? '17:00';

        const [rec] = await this.db
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
          .limit(1)
          .execute();

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

        let startTimeStr = defaultStartTimeStr;
        let endTimeStr = endDefault;
        let tolerance = lateToleranceMins;

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

  /** ---------- monthly (single-pass, cached) ---------- */
  async getEmployeeAttendanceByMonth(
    employeeId: string,
    companyId: string,
    yearMonth: string,
  ): Promise<{
    summaryList: Array<{
      date: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      status: DayStatus;
    }>;
  }> {
    return this.cache.getOrSetVersioned(
      companyId,
      ['attendance', 'employee', employeeId, 'by-month-fast', yearMonth],
      async () => {
        const [y, m] = yearMonth.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m - 1, new Date(y, m, 0).getDate());
        const allDays = eachDayOfInterval({ start, end }).map((d) =>
          format(d, 'yyyy-MM-dd'),
        );
        const todayStr = new Date().toISOString().split('T')[0];
        const days = allDays.filter((d) => d <= todayStr);

        // 1 query: all records for month
        const recs = await this.db
          .select({
            id: attendanceRecords.id,
            clockIn: attendanceRecords.clockIn,
            clockOut: attendanceRecords.clockOut,
            workDurationMinutes: attendanceRecords.workDurationMinutes,
            overtimeMinutes: attendanceRecords.overtimeMinutes,
          })
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.employeeId, employeeId),
              eq(attendanceRecords.companyId, companyId),
              gte(attendanceRecords.clockIn, new Date(y, m - 1, 1)),
              lte(
                attendanceRecords.clockIn,
                new Date(
                  y,
                  m - 1,
                  new Date(y, m, 0).getDate(),
                  23,
                  59,
                  59,
                  999,
                ),
              ),
            ),
          )
          .execute();

        const byDay = new Map<string, (typeof recs)[number]>();
        for (const r of recs) {
          const key = r.clockIn.toISOString().split('T')[0];
          if (!byDay.has(key)) byDay.set(key, r); // first-in wins
        }

        // settings once
        const s = await this.getSettings(companyId);
        const defaultStart = s['default_start_time'] ?? '09:00';
        const defaultTol = Number(s['late_tolerance_minutes'] ?? 10);

        const out = days.map((dateKey) => {
          const rec = byDay.get(dateKey);
          if (!rec) {
            return {
              date: dateKey,
              checkInTime: null,
              checkOutTime: null,
              status: 'absent' as DayStatus,
            };
          }

          const startStr = defaultStart;
          const tol = defaultTol;
          // (Optional) If you have a weekday-based shift map, compute here and set startStr/endStr/tol.

          const shiftStart = parseISO(`${dateKey}T${startStr}:00`);
          const checkIn = new Date(rec.clockIn);
          const diffLate = (checkIn.getTime() - shiftStart.getTime()) / 60000;
          const status: DayStatus = diffLate > tol ? 'late' : 'present';

          return {
            date: dateKey,
            checkInTime: checkIn.toTimeString().slice(0, 8),
            checkOutTime: rec.clockOut
              ? new Date(rec.clockOut).toTimeString().slice(0, 8)
              : null,
            status,
          };
        });

        // reverse newest-first if you prefer
        return { summaryList: out.reverse() };
      },
    );
  }

  /** ---------- adjustments ---------- */
  async adjustAttendanceRecord(
    dto: AdjustAttendanceDto,
    attendanceRecordId: string,
    user: User,
    ip: string,
  ) {
    await this.db
      .insert(attendanceAdjustments)
      .values({
        attendanceRecordId,
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
      .limit(1)
      .execute();

    if (!attendanceRecord)
      throw new BadRequestException('Attendance record not found.');

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

    await this.cache.bumpCompanyVersion(user.companyId);
    return 'Attendance record adjusted successfully.';
  }
}
