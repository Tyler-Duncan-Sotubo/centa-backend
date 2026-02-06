import { Injectable, Inject } from '@nestjs/common';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
  isWeekend,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { eq, gte, lte, and, sql } from 'drizzle-orm';
import { EmployeeShiftsService } from '../employee-shifts/employee-shifts.service';
import { AttendanceSettingsService } from '../settings/attendance-settings.service';
import { holidays } from 'src/modules/leave/schema/holidays.schema';
import { attendanceRecords, employeeShifts, shifts } from '../schema';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { LeaveRequestService } from 'src/modules/leave/request/leave-request.service';
import { DepartmentService } from 'src/modules/core/department/department.service';
import { companyLocations, employees } from 'src/drizzle/schema';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

@Injectable()
export class ReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly attendanceSettingsService: AttendanceSettingsService,
    private readonly employeeShiftsService: EmployeeShiftsService,
    private readonly employeesService: EmployeesService,
    private readonly leaveRequestService: LeaveRequestService,
    private readonly departmentsService: DepartmentService,
  ) {}

  async getDailyAttendanceSummary(companyId: string) {
    // ✅ Use company timezone (preferably from company settings)
    const tz = 'Africa/Lagos';

    // ---- day keys in company TZ ----
    const todayKey = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
    const yesterdayKey = formatInTimeZone(
      new Date(Date.now() - 86400000),
      tz,
      'yyyy-MM-dd',
    );

    // ---- UTC windows for querying DB ----
    const todayStartUtc = fromZonedTime(`${todayKey}T00:00:00.000`, tz);
    const todayEndUtc = fromZonedTime(`${todayKey}T23:59:59.999`, tz);

    const yesterdayStartUtc = fromZonedTime(`${yesterdayKey}T00:00:00.000`, tz);
    const yesterdayEndUtc = fromZonedTime(`${yesterdayKey}T23:59:59.999`, tz);

    // ---- settings (tolerance + defaults) ----
    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);

    const defaultStart = s['default_start_time'] ?? '09:00';
    const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);

    const workStartUtcToday = fromZonedTime(
      `${todayKey}T${defaultStart}:00`,
      tz,
    );
    const lateBoundaryUtcToday = new Date(
      workStartUtcToday.getTime() + lateToleranceMins * 60000,
    );

    const workStartUtcYesterday = fromZonedTime(
      `${yesterdayKey}T${defaultStart}:00`,
      tz,
    );
    const lateBoundaryUtcYesterday = new Date(
      workStartUtcYesterday.getTime() + lateToleranceMins * 60000,
    );

    // 1) Load employees & departments
    const employees = await this.employeesService.findAllEmployees(companyId);
    const allEmployees = employees.filter(
      (emp: any) => emp.employmentStatus === 'active',
    );

    const allDepartments = await this.departmentsService.findAll(companyId);

    // 2) Load today & yesterday attendance records (correct windows)
    const [todayRecs, yesterdayRecs] = await Promise.all([
      this.db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, companyId),
            gte(attendanceRecords.clockIn, todayStartUtc),
            lte(attendanceRecords.clockIn, todayEndUtc),
          ),
        )
        .execute(),

      this.db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, companyId),
            gte(attendanceRecords.clockIn, yesterdayStartUtc),
            lte(attendanceRecords.clockIn, yesterdayEndUtc),
          ),
        )
        .execute(),
    ]);

    // Build per-employee summary from TODAY records
    const summaryList = allEmployees.map((emp: any) => {
      const rec = todayRecs.find((r: any) => r.employeeId === emp.id);
      const dept = allDepartments.find((d: any) => d.id === emp.departmentId);

      const ci = rec?.clockIn ? new Date(rec.clockIn) : null; // UTC instant
      const co = rec?.clockOut ? new Date(rec.clockOut) : null;

      const isLate = ci ? ci.getTime() > lateBoundaryUtcToday.getTime() : false;

      let status: 'absent' | 'present' | 'late' = 'absent';
      if (ci) status = isLate ? 'late' : 'present';

      let totalWorkedMinutes: number | null = null;
      if (ci && co) {
        totalWorkedMinutes = Math.floor((co.getTime() - ci.getTime()) / 60000);
      }

      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        department: dept?.name ?? 'Unknown',

        // keep ISO (recommended; UI can format to Lagos)
        checkInTime: ci?.toISOString() ?? null,
        checkOutTime: co?.toISOString() ?? null,

        status,
        totalWorkedMinutes,
      };
    });

    const presentCount = summaryList.filter(
      (e: any) => e.status === 'present',
    ).length;
    const lateCount = summaryList.filter(
      (e: any) => e.status === 'late',
    ).length;
    const absentCount = summaryList.filter(
      (e: any) => e.status === 'absent',
    ).length;

    const attendanceRate =
      allEmployees.length > 0
        ? (((presentCount + lateCount) / allEmployees.length) * 100).toFixed(
            2,
          ) + '%'
        : '0%';

    // average check-in time today (as UTC instant)
    const checkInMillisToday = summaryList
      .filter((e: any) => e.status !== 'absent' && e.checkInTime)
      .map((e: any) => new Date(e.checkInTime).getTime());

    const averageCheckInTime = checkInMillisToday.length
      ? new Date(
          checkInMillisToday.reduce((a: number, b: number) => a + b, 0) /
            checkInMillisToday.length,
        )
      : null;

    // yesterday metrics
    const yesterdayPresent = yesterdayRecs.length;
    const yesterdayLate = yesterdayRecs.filter((r: any) => {
      const ci = r.clockIn ? new Date(r.clockIn) : null;
      return ci ? ci.getTime() > lateBoundaryUtcYesterday.getTime() : false;
    }).length;

    const attendanceChangePercent =
      yesterdayPresent > 0
        ? Math.round(
            ((presentCount + lateCount - yesterdayPresent) / yesterdayPresent) *
              100,
          )
        : 0;

    const lateChangePercent =
      yesterdayLate > 0
        ? Math.round(((lateCount - yesterdayLate) / yesterdayLate) * 100)
        : 0;

    // average check-in time yesterday
    const checkInMillisYesterday = yesterdayRecs
      .map((r: any) => (r.clockIn ? new Date(r.clockIn).getTime() : null))
      .filter((t: any): t is number => typeof t === 'number');

    const averageCheckInTimeYesterday = checkInMillisYesterday.length
      ? new Date(
          checkInMillisYesterday.reduce((a: number, b: number) => a + b, 0) /
            checkInMillisYesterday.length,
        )
      : null;

    // ------- DASHBOARD METRICS BELOW (timezone-correct windows) -------

    // Last 7 days keys in company TZ (today inclusive)
    const last7DayKeys = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    }).map((d) => formatInTimeZone(d, tz, 'yyyy-MM-dd'));

    // One query for last 7 days (UTC window)
    const last7StartUtc = fromZonedTime(`${last7DayKeys[0]}T00:00:00.000`, tz);
    const last7EndUtc = fromZonedTime(
      `${last7DayKeys[last7DayKeys.length - 1]}T23:59:59.999`,
      tz,
    );

    const last7Recs = await this.db
      .select({
        clockIn: attendanceRecords.clockIn,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, last7StartUtc),
          lte(attendanceRecords.clockIn, last7EndUtc),
        ),
      )
      .execute();

    // group counts by local day key
    const byDayCount = new Map<string, number>();
    for (const r of last7Recs) {
      const k = formatInTimeZone(new Date(r.clockIn), tz, 'yyyy-MM-dd');
      byDayCount.set(k, (byDayCount.get(k) ?? 0) + 1);
    }

    const sevenDayTrend = last7DayKeys.map((k) =>
      Number(
        (
          ((byDayCount.get(k) ?? 0) / Math.max(allEmployees.length, 1)) *
          100
        ).toFixed(2),
      ),
    );

    // Week-to-date: from Monday in company TZ to today
    // Compute Monday key by getting today in TZ, then stepping back
    const todayLocalDate = new Date(
      fromZonedTime(`${todayKey}T12:00:00.000`, tz),
    ); // safe noon anchor
    const dayOfWeek = Number(formatInTimeZone(todayLocalDate, tz, 'i')); // 1=Mon..7=Sun
    const mondayLocal = new Date(
      todayLocalDate.getTime() - (dayOfWeek - 1) * 86400000,
    );
    const mondayKey = formatInTimeZone(mondayLocal, tz, 'yyyy-MM-dd');

    const wtdStartUtc = fromZonedTime(`${mondayKey}T00:00:00.000`, tz);
    const wtdEndUtc = todayEndUtc;

    const wtdRecs = await this.db
      .select({ clockIn: attendanceRecords.clockIn })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, wtdStartUtc),
          lte(attendanceRecords.clockIn, wtdEndUtc),
        ),
      )
      .execute();

    // number of days elapsed in WTD including today
    const wtdDayCount = Math.max(
      1,
      Math.round((todayEndUtc.getTime() - wtdStartUtc.getTime()) / 86400000) +
        1,
    );

    const wtdAttendanceRate =
      (
        (wtdRecs.length / (Math.max(allEmployees.length, 1) * wtdDayCount)) *
        100
      ).toFixed(2) + '%';

    // Month-to-date overtime (clockIn window from month start to today end)
    const monthStartKey = formatInTimeZone(new Date(), tz, 'yyyy-MM-01');
    const monthStartUtc = fromZonedTime(`${monthStartKey}T00:00:00.000`, tz);

    const overtimeAgg = await this.db
      .select({
        total: sql`COALESCE(SUM(${attendanceRecords.overtimeMinutes}), 0)`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, monthStartUtc),
          lte(attendanceRecords.clockIn, todayEndUtc),
        ),
      )
      .execute();

    const totalOvertimeMinutes = Number(overtimeAgg[0]?.total || 0);
    const overtimeThisMonth = `${Math.floor(totalOvertimeMinutes / 60)} hrs`;

    // Top late arrivals MTD (prefer stored flag if you set it on clockOut)
    const topLateAgg = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        count: sql`COUNT(*)`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, monthStartUtc),
          lte(attendanceRecords.clockIn, todayEndUtc),
          eq(attendanceRecords.isLateArrival, true),
        ),
      )
      .groupBy(attendanceRecords.employeeId)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5)
      .execute();

    const topLateArrivals = topLateAgg.map((entry: any) => {
      const emp = allEmployees.find((e: any) => e.id === entry.employeeId);
      return `${emp?.firstName ?? ''} ${emp?.lastName ?? ''} (${entry.count})`;
    });

    // Department attendance rate (today)
    const deptMap: Record<string, { pres: number; tot: number }> = {};
    summaryList.forEach((e: any) => {
      deptMap[e.department] ??= { pres: 0, tot: 0 };
      if (e.status !== 'absent') deptMap[e.department].pres++;
      deptMap[e.department].tot++;
    });

    const departmentRates = Object.entries(deptMap).map(([dept, data]) => ({
      department: dept,
      rate: ((data.pres / Math.max(data.tot, 1)) * 100).toFixed(2) + '%',
    }));

    // Rolling 30-day absenteeism (based on clockIn presence)
    const thirtyDaysAgoKey = formatInTimeZone(
      subDays(new Date(), 29),
      tz,
      'yyyy-MM-dd',
    );
    const thirtyDaysAgoUtc = fromZonedTime(
      `${thirtyDaysAgoKey}T00:00:00.000`,
      tz,
    );

    const recs30 = await this.db
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, thirtyDaysAgoUtc),
          lte(attendanceRecords.clockIn, todayEndUtc),
        ),
      )
      .execute();

    const totalPossibleAttendance = allEmployees.length * 30;
    const absences = totalPossibleAttendance - recs30.length;

    const rolling30DayAbsenteeismRate =
      ((absences / Math.max(totalPossibleAttendance, 1)) * 100).toFixed(2) +
      '%';

    return {
      details: {
        date: todayKey,
        totalEmployees: allEmployees.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        attendanceRate,
        averageCheckInTime,
      },
      summaryList,
      metrics: {
        attendanceChangePercent,
        lateChangePercent,
        averageCheckInTimeChange: {
          today: averageCheckInTime,
          yesterday: averageCheckInTimeYesterday,
        },
      },
      dashboard: {
        sevenDayTrend,
        wtdAttendanceRate,
        overtimeThisMonth,
        topLateArrivals,
        departmentRates,
        rolling30DayAbsenteeismRate,
      },
    };
  }

  async getDailySummaryList(companyId: string, date: string) {
    const tz = 'Africa/Lagos';

    const dayKey = date.includes('T')
      ? formatInTimeZone(new Date(date), tz, 'yyyy-MM-dd')
      : date;

    const startOfDayUtc = fromZonedTime(`${dayKey}T00:00:00.000`, tz);
    const endOfDayUtc = fromZonedTime(`${dayKey}T23:59:59.999`, tz);

    const workStartUtc = fromZonedTime(`${dayKey}T09:00:00.000`, tz);

    // ✅ tolerance
    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
    const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
    const lateBoundaryUtc = new Date(
      workStartUtc.getTime() + lateToleranceMins * 60000,
    );

    const employees = await this.employeesService.findAllEmployees(companyId);
    const allEmployees = employees.filter(
      (emp) => emp.employmentStatus === 'active',
    );

    const departments = await this.departmentsService.findAll(companyId);

    const attendance = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfDayUtc),
          lte(attendanceRecords.clockIn, endOfDayUtc),
        ),
      )
      .execute();

    const summaryList = allEmployees.map((emp) => {
      const rec = attendance.find((r) => r.employeeId === emp.id);
      const dept = departments.find((d) => d.id === emp.departmentId);

      const ci = rec?.clockIn ? new Date(rec.clockIn) : null;
      const co = rec?.clockOut ? new Date(rec.clockOut) : null;

      // ✅ use lateBoundaryUtc
      const isLate = ci ? ci.getTime() > lateBoundaryUtc.getTime() : false;

      let status: 'absent' | 'present' | 'late' = 'absent';
      if (ci) status = isLate ? 'late' : 'present';

      let totalWorkedMinutes: number | null = null;
      if (ci && co) {
        totalWorkedMinutes = Math.floor((co.getTime() - ci.getTime()) / 60000);
      }

      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        department: dept?.name ?? 'Unknown',
        checkInTime: ci ? formatInTimeZone(ci, tz, 'HH:mm:ss') : null,
        checkOutTime: co ? formatInTimeZone(co, tz, 'HH:mm:ss') : null,
        status,
        totalWorkedMinutes,
      };
    });
    return summaryList;
  }

  /**
   * Returns per-employee attendance counts (present/late/absent/onLeave/holidays/penalties)
   * for the given month, using company settings and shift overrides.
   */
  async getMonthlyAttendanceSummary(
    companyId: string,
    yearMonth: string, // "YYYY-MM"
  ) {
    // 1) Parse the start/end of the month
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month - 1, new Date(year, month, 0).getDate());
    const startOfMonthDay = new Date(start);
    startOfMonthDay.setHours(0, 0, 0, 0);
    const endOfMonthDay = new Date(end);
    endOfMonthDay.setHours(23, 59, 59, 999);

    // 2) Load all attendance settings in one go
    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
    const useShifts = s['use_shifts'] ?? false;
    const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
    const defaultWorkingDays = Number(s['default_working_days'] ?? 5);
    const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
    const allowOvertime = Boolean(s['allow_overtime']);
    const overtimeRate = Number(s['overtime_rate'] ?? 1.0);

    // 3) Load public holidays for this year
    const allHolidays = await this.db
      .select()
      .from(holidays)
      .where(eq(holidays.year, String(year)))
      .execute();
    const holidaySet = new Set(allHolidays.map((h) => h.date));

    // 4) Load approved leave requests for company
    const leaves = await this.leaveRequestService.findAll(companyId);

    const leaveMap = new Map<string, Set<string>>();
    for (const lr of leaves) {
      const from = new Date(lr.startDate);
      const to = new Date(lr.endDate);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = format(d, 'yyyy-MM-dd');
        if (!leaveMap.has(lr.employeeId)) {
          leaveMap.set(lr.employeeId, new Set());
        }
        leaveMap.get(lr.employeeId)!.add(key);
      }
    }

    // 5) Load attendance by clockIn timestamp instead of a date column
    const recs = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfMonthDay),
          lte(attendanceRecords.clockIn, endOfMonthDay),
        ),
      )
      .execute();

    // build map keyed by “YYYY-MM-DD” derived from clockIn
    const attendanceMap = new Map<
      string,
      Map<string, typeof attendanceRecords.$inferSelect>
    >();

    for (const rec of recs) {
      const dayKey = format(rec.clockIn, 'yyyy-MM-dd'); // use format() consistently
      if (!attendanceMap.has(rec.employeeId)) {
        attendanceMap.set(rec.employeeId, new Map());
      }
      attendanceMap.get(rec.employeeId)!.set(dayKey, rec);
    }

    // 6) Load all employees
    const emps = await this.employeesService.findAllEmployees(companyId);

    // 7) Build list of all working dates in month
    const allDates = eachDayOfInterval({ start, end }).map((d) =>
      format(d, 'yyyy-MM-dd'),
    );

    const results: {
      employeeId: string;
      name: string;
      present: number;
      late: number;
      absent: number;
      onLeave: number;
      holidays: number;
      penalties: number;
    }[] = [];

    for (const emp of emps) {
      let present = 0;
      let late = 0;
      let absent = 0;
      let onLeave = 0;
      let holidaysCount = 0;
      let penalties = 0;

      for (const dateKey of allDates) {
        // skip weekends if defaultWorkingDays < 7
        if (defaultWorkingDays < 7) {
          const dayName = format(parseISO(dateKey), 'EEE');
          const weekendDays = ['Sat', 'Sun'];
          if (weekendDays.includes(dayName)) continue;
        }

        // public holiday?
        if (holidaySet.has(dateKey)) {
          holidaysCount++;
          continue;
        }

        // on leave?
        if (leaveMap.get(emp.id)?.has(dateKey)) {
          onLeave++;
          continue;
        }

        // get attendance record
        const empMap = attendanceMap.get(emp.id) ?? new Map();
        const rec = empMap.get(dateKey); // dateKey = "2025-04-29"
        if (!rec || !rec.clockIn) {
          absent++;
          continue;
        }

        // determine start-tolerance based on shift or default
        let { startTime, tolerance } = {
          startTime: defaultStartTimeStr,
          tolerance: lateToleranceMins,
        };

        if (useShifts) {
          const shift =
            await this.employeeShiftsService.getActiveShiftForEmployee(
              emp.id,
              companyId,
              dateKey,
            );
          if (shift) {
            startTime = shift.startTime;
            tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
          }
        }

        const shiftStart = parseISO(`${dateKey}T${startTime}:00`);
        const checkIn = new Date(rec.clockIn);
        const diffMins = (checkIn.getTime() - shiftStart.getTime()) / 60000;

        if (diffMins <= tolerance) {
          present++;
        } else {
          late++;
          if (allowOvertime && diffMins > tolerance) {
            penalties += Math.round((diffMins - tolerance) * overtimeRate);
          }
        }
      }

      results.push({
        employeeId: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        present,
        late,
        absent,
        onLeave,
        holidays: holidaysCount,
        penalties,
      });
    }

    return results;
  }

  async getLast6MonthsAttendanceSummary(companyId: string) {
    const now = new Date();
    const summaries: {
      month: string;
      present: number;
      absent: number;
      late: number;
    }[] = [];

    // Global settings, holidays, employees, shifts
    const s =
      await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
    const useShifts = s['use_shifts'] ?? false;
    const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
    const defaultWorkingDays = Number(s['default_working_days'] ?? 5);
    const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);

    const allEmployees =
      await this.employeesService.findAllEmployees(companyId);
    const leaves = await this.leaveRequestService.findAll(companyId);

    const leaveMap = new Map<string, Set<string>>();
    for (const lr of leaves) {
      const from = new Date(lr.startDate);
      const to = new Date(lr.endDate);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = format(d, 'yyyy-MM-dd');
        if (!leaveMap.has(lr.employeeId))
          leaveMap.set(lr.employeeId, new Set());
        leaveMap.get(lr.employeeId)!.add(key);
      }
    }

    // Iterate over last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const year = start.getFullYear();
      const month = format(start, 'MMMM');

      // Holidays for that year
      const holidaysForYear = await this.db
        .select()
        .from(holidays)
        .where(eq(holidays.year, String(year)))
        .execute();
      const holidaySet = new Set(holidaysForYear.map((h) => h.date));

      // Attendance records for the month
      const recs = await this.db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.companyId, companyId),
            gte(attendanceRecords.clockIn, start),
            lte(attendanceRecords.clockIn, end),
          ),
        )
        .execute();

      const attendanceMap = new Map<
        string,
        Map<string, typeof attendanceRecords.$inferSelect>
      >();

      for (const rec of recs) {
        const dayKey = format(rec.clockIn, 'yyyy-MM-dd');
        if (!attendanceMap.has(rec.employeeId)) {
          attendanceMap.set(rec.employeeId, new Map());
        }
        attendanceMap.get(rec.employeeId)!.set(dayKey, rec);
      }

      const allDates = eachDayOfInterval({ start, end }).map((d) =>
        format(d, 'yyyy-MM-dd'),
      );

      let present = 0;
      let late = 0;
      let absent = 0;

      for (const emp of allEmployees) {
        for (const dateKey of allDates) {
          // Skip weekends
          if (defaultWorkingDays < 7) {
            const dayName = format(parseISO(dateKey), 'EEE');
            if (['Sat', 'Sun'].includes(dayName)) continue;
          }

          // Holiday?
          if (holidaySet.has(dateKey)) continue;

          // Leave?
          if (leaveMap.get(emp.id)?.has(dateKey)) continue;

          // Attendance?
          const empMap = attendanceMap.get(emp.id) ?? new Map();
          const rec = empMap.get(dateKey);
          if (!rec || !rec.clockIn) {
            absent++;
            continue;
          }

          // Determine expected start time
          let startTime = defaultStartTimeStr;
          let tolerance = lateToleranceMins;

          if (useShifts) {
            const shift =
              await this.employeeShiftsService.getActiveShiftForEmployee(
                emp.id,
                companyId,
                dateKey,
              );
            if (shift) {
              startTime = shift.startTime;
              tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
            }
          }

          const shiftStart = parseISO(`${dateKey}T${startTime}:00`);
          const checkIn = new Date(rec.clockIn);
          const diffMins = (checkIn.getTime() - shiftStart.getTime()) / 60000;

          if (diffMins <= tolerance) {
            present++;
          } else {
            late++;
          }
        }
      }

      summaries.push({ month, present, absent, late });
    }

    return summaries;
  }

  async getLateArrivalsReport(companyId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // Last day of month

    const lateArrivals = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        employeeNumber: employees.employeeNumber,
        name: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
        clockIn: attendanceRecords.clockIn,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, start),
          lte(attendanceRecords.clockIn, end),
          eq(attendanceRecords.isLateArrival, true),
        ),
      )
      .execute();

    return lateArrivals;
  }

  // OVERTIME REPORT

  async getOvertimeReport(companyId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const overtimeRecords = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        clockIn: attendanceRecords.clockIn,
        overtimeMinutes: attendanceRecords.overtimeMinutes,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, start),
          lte(attendanceRecords.clockIn, end),
          gte(attendanceRecords.overtimeMinutes, 1), // only those who have overtime
        ),
      )
      .execute();

    return overtimeRecords;
  }

  //Absenteeism Report
  async getAbsenteeismReport(
    companyId: string,
    startDate: string,
    endDate: string,
  ) {
    const startOfMonthDay = new Date(startDate);
    startOfMonthDay.setHours(0, 0, 0, 0);
    const endOfMonthDay = new Date(endDate);
    endOfMonthDay.setHours(23, 59, 59, 999);
    const allEmployees =
      await this.employeesService.findAllEmployees(companyId);

    const attendanceRecordsList = await this.db
      .select({
        employeeId: attendanceRecords.employeeId,
        clockIn: attendanceRecords.clockIn,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, startOfMonthDay),
          lte(attendanceRecords.clockIn, endOfMonthDay),
        ),
      )
      .execute();

    const attendanceSet = new Set(
      attendanceRecordsList.map(
        (rec) => `${rec.employeeId}-${rec.clockIn.toISOString().split('T')[0]}`,
      ),
    );

    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    }).map((d) => format(d, 'yyyy-MM-dd'));

    const absenteeismReport: {
      employeeId: string;
      name: string;
      date: string;
    }[] = [];

    for (const emp of allEmployees) {
      for (const day of days) {
        const key = `${emp.id}-${day}`;
        if (!attendanceSet.has(key)) {
          absenteeismReport.push({
            employeeId: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            date: day,
          });
        }
      }
    }

    return absenteeismReport;
  }

  //Departmental Attendance Report

  async getDepartmentAttendanceSummary(companyId: string, yearMonth: string) {
    const [year, month] = yearMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const daysInMonth = end.getDate();

    const employees = await this.employeesService.findAllEmployees(companyId);
    const departments = await this.departmentsService.findAll(companyId);

    const recs = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.companyId, companyId),
          gte(attendanceRecords.clockIn, start),
          lte(attendanceRecords.clockIn, end),
        ),
      )
      .execute();

    // Step 1: Group attendance records by employee, normalize per-day
    const recordsByEmployee: Record<string, Set<string>> = {};

    for (const rec of recs) {
      const dateStr = new Date(rec.clockIn).toDateString(); // e.g., "Mon May 01 2025"
      if (!recordsByEmployee[rec.employeeId]) {
        recordsByEmployee[rec.employeeId] = new Set();
      }
      recordsByEmployee[rec.employeeId].add(dateStr);
    }

    // Step 2: Calculate attendance summary by department
    const departmentMap: Record<
      string,
      { present: number; absent: number; total: number }
    > = {};

    for (const emp of employees) {
      const deptName =
        departments.find((d) => d.id === emp.departmentId)?.name ?? 'Unknown';
      departmentMap[deptName] ??= { present: 0, absent: 0, total: 0 };

      const presentDays = recordsByEmployee[emp.id]?.size || 0;
      const absentDays = daysInMonth - presentDays;

      departmentMap[deptName].present += presentDays;
      departmentMap[deptName].absent += absentDays;
      departmentMap[deptName].total += daysInMonth;
    }

    return departmentMap;
  }

  async getCombinedAttendanceReports(
    companyId: string,
    yearMonth?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const today = new Date().toISOString().split('T')[0];
    const ym = yearMonth ?? today.slice(0, 7);
    const defaultStart = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split('T')[0];
    const start = startDate ?? defaultStart;
    const end = endDate ?? today;

    const [
      dailySummary,
      monthlySummary,
      lateArrivals,
      overtime,
      absenteeism,
      departmentSummary,
    ] = await Promise.all([
      this.getDailyAttendanceSummary(companyId),
      this.getMonthlyAttendanceSummary(companyId, ym),
      this.getLateArrivalsReport(companyId, ym),
      this.getOvertimeReport(companyId, ym),
      this.getAbsenteeismReport(companyId, start, end),
      this.getDepartmentAttendanceSummary(companyId, ym),
    ]);

    return {
      dailySummary,
      monthlySummary,
      lateArrivals,
      overtime,
      absenteeism,
      departmentSummary,
    };
  }

  async getShiftDashboardSummaryByMonth(
    companyId: string,
    yearMonth: string,
    filters?: { locationId?: string; departmentId?: string },
  ) {
    const from = `${yearMonth}-01`;
    const to = new Date(
      new Date(from).getFullYear(),
      new Date(from).getMonth() + 1,
      0,
    )
      .toISOString()
      .split('T')[0];

    // Build shared WHERE conditions
    const conditions = [
      eq(employeeShifts.companyId, companyId),
      eq(employeeShifts.isDeleted, false),
      gte(employeeShifts.shiftDate, from),
      lte(employeeShifts.shiftDate, to),
    ];

    if (filters?.locationId) {
      conditions.push(eq(shifts.locationId, filters.locationId));
    }

    if (filters?.departmentId) {
      conditions.push(eq(employees.departmentId, filters.departmentId));
    }

    // Fetch summary
    const [summary, breakdown] = await Promise.all([
      this.db
        .select({
          yearMonth:
            sql<string>`TO_CHAR(${employeeShifts.shiftDate}, 'YYYY-MM')`.as(
              'yearMonth',
            ),
          totalShifts: sql<number>`COUNT(*)`.as('totalShifts'),
          uniqueEmployees:
            sql<number>`COUNT(DISTINCT ${employeeShifts.employeeId})`.as(
              'uniqueEmployees',
            ),
          uniqueShiftTypes:
            sql<number>`COUNT(DISTINCT ${employeeShifts.shiftId})`.as(
              'uniqueShiftTypes',
            ),
        })
        .from(employeeShifts)
        .leftJoin(employees, eq(employees.id, employeeShifts.employeeId))
        .leftJoin(shifts, eq(shifts.id, employeeShifts.shiftId))
        .where(and(...conditions))
        .groupBy(sql`TO_CHAR(${employeeShifts.shiftDate}, 'YYYY-MM')`)
        .execute(),

      this.db
        .select({
          employeeId: employeeShifts.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          shiftName: shifts.name,
          locationName: companyLocations.name,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          daysScheduled: sql<number>`COUNT(*)`,
          daysPresent: sql<number>`COUNT(${attendanceRecords.id})`,
        })
        .from(employeeShifts)
        .leftJoin(employees, eq(employees.id, employeeShifts.employeeId))
        .leftJoin(shifts, eq(shifts.id, employeeShifts.shiftId))
        .leftJoin(
          attendanceRecords,
          and(
            eq(attendanceRecords.employeeId, employeeShifts.employeeId),
            eq(
              sql`${attendanceRecords.createdAt}::date`,
              employeeShifts.shiftDate,
            ),
            eq(attendanceRecords.companyId, companyId),
          ),
        )
        .leftJoin(companyLocations, eq(companyLocations.id, shifts.locationId))
        .where(and(...conditions))
        .groupBy(
          employeeShifts.employeeId,
          employees.firstName,
          employees.lastName,
          shifts.name,
          shifts.startTime,
          shifts.endTime,
          companyLocations.name,
        )
        .execute(),
    ]);

    // Workdays in month (Mon–Fri)
    const allDates = eachDayOfInterval({
      start: parseISO(from),
      end: parseISO(to),
    });
    const workdays = allDates.filter((d) => !isWeekend(d)).length;

    // Enrich breakdown with daysExpected
    const detailedBreakdown = breakdown.map((row) => ({
      ...row,
      yearMonth,
      daysExpected: workdays,
    }));

    return {
      yearMonth,
      filters,
      monthlySummary: summary[0] || {
        yearMonth,
        totalShifts: 0,
        uniqueEmployees: 0,
        uniqueShiftTypes: 0,
      },
      detailedBreakdown,
    };
  }
}
