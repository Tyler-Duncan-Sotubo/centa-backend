"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const date_fns_1 = require("date-fns");
const drizzle_orm_1 = require("drizzle-orm");
const employee_shifts_service_1 = require("../employee-shifts/employee-shifts.service");
const attendance_settings_service_1 = require("../settings/attendance-settings.service");
const holidays_schema_1 = require("../../leave/schema/holidays.schema");
const schema_1 = require("../schema");
const employees_service_1 = require("../../core/employees/employees.service");
const leave_request_service_1 = require("../../leave/request/leave-request.service");
const department_service_1 = require("../../core/department/department.service");
const schema_2 = require("../../../drizzle/schema");
let ReportService = class ReportService {
    constructor(db, attendanceSettingsService, employeeShiftsService, employeesService, leaveRequestService, departmentsService) {
        this.db = db;
        this.attendanceSettingsService = attendanceSettingsService;
        this.employeeShiftsService = employeeShiftsService;
        this.employeesService = employeesService;
        this.leaveRequestService = leaveRequestService;
        this.departmentsService = departmentsService;
    }
    async getDailyAttendanceSummary(companyId) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split('T')[0];
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(yesterday);
        endOfDay.setHours(23, 59, 59, 999);
        const workStartBoundary = new Date();
        workStartBoundary.setHours(9, 0, 0, 0);
        function toDate(d) {
            if (!d)
                return null;
            return typeof d === 'string'
                ? new Date(d.replace(' ', 'T'))
                : new Date(d);
        }
        const employees = await this.employeesService.findAllEmployees(companyId);
        const allEmployees = employees.filter((emp) => emp.employmentStatus === 'active');
        const allDepartments = await this.departmentsService.findAll(companyId);
        const [todayRecs, yesterdayRecs] = await Promise.all([
            this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay)))
                .execute(),
            this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay)))
                .execute(),
        ]);
        const summaryList = allEmployees.map((emp) => {
            const rec = todayRecs.find((r) => r.employeeId === emp.id);
            const dept = allDepartments.find((d) => d.id === emp.departmentId);
            const ci = toDate(rec?.clockIn);
            const co = toDate(rec?.clockOut);
            const isLate = ci ? ci > workStartBoundary : false;
            let status = 'absent';
            if (ci)
                status = isLate ? 'late' : 'present';
            let totalWorkedMinutes = null;
            if (ci && co) {
                const diffMs = co.getTime() - ci.getTime();
                totalWorkedMinutes = Math.floor(diffMs / 1000 / 60);
            }
            return {
                employeeId: emp.id,
                employeeNumber: emp.employeeNumber,
                name: `${emp.firstName} ${emp.lastName}`,
                department: dept?.name ?? 'Unknown',
                checkInTime: ci?.toISOString() ?? null,
                checkOutTime: co?.toISOString() ?? null,
                status,
                totalWorkedMinutes,
            };
        });
        const presentCount = summaryList.filter((e) => e.status === 'present').length;
        const lateCount = summaryList.filter((e) => e.status === 'late').length;
        const absentCount = summaryList.filter((e) => e.status === 'absent').length;
        const checkInMillis = summaryList
            .filter((e) => e.status !== 'absent' && e.checkInTime)
            .map((e) => {
            const [hours, minutes] = e.checkInTime.split(':').map(Number);
            return new Date().setHours(hours, minutes, 0, 0);
        });
        const averageCheckInTime = checkInMillis.length
            ? new Date(checkInMillis.reduce((a, b) => a + b, 0) / checkInMillis.length)
            : null;
        const yesterdayPresent = yesterdayRecs.length;
        const yesterdayLate = yesterdayRecs.filter((r) => {
            const ci = toDate(r.clockIn);
            return ci && ci > workStartBoundary;
        }).length;
        const attendanceChangePercent = yesterdayPresent > 0
            ? Math.round(((presentCount + lateCount - yesterdayPresent) / yesterdayPresent) *
                100)
            : 0;
        const lateChangePercent = yesterdayLate > 0
            ? Math.round(((lateCount - yesterdayLate) / yesterdayLate) * 100)
            : 0;
        const yesterdayCheckInMillis = yesterdayRecs
            .map((r) => toDate(r.clockIn))
            .filter((d) => !!d)
            .map((d) => d.getTime());
        const averageCheckInTimeYesterday = yesterdayCheckInMillis.length
            ? new Date(yesterdayCheckInMillis.reduce((a, b) => a + b, 0) /
                yesterdayCheckInMillis.length)
            : null;
        const averageCheckInTimeChange = {
            today: averageCheckInTime,
            yesterday: averageCheckInTimeYesterday,
        };
        const last7Days = (0, date_fns_1.eachDayOfInterval)({
            start: (0, date_fns_1.subDays)(new Date(today), 6),
            end: new Date(today),
        }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
        const sevenDayTrend = await Promise.all(last7Days.map(async (date) => {
            const recs = await this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.createdAt, new Date(date))))
                .execute();
            return Number(((recs.length / allEmployees.length) * 100).toFixed(2));
        }));
        const todayDate = new Date(today);
        const dayOfWeek = todayDate.getDay() || 7;
        const monday = (0, date_fns_1.subDays)(todayDate, dayOfWeek - 1);
        const wtdDates = (0, date_fns_1.eachDayOfInterval)({ start: monday, end: todayDate }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
        const wtdRecs = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.createdAt, new Date(wtdDates[0])), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.createdAt, new Date(wtdDates[wtdDates.length - 1]))))
            .execute();
        const wtdAttendanceRate = ((wtdRecs.length / (allEmployees.length * wtdDates.length)) *
            100).toFixed(2) + '%';
        const monthStart = (0, date_fns_1.format)(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1), 'yyyy-MM-dd');
        const overtimeAgg = await this.db
            .select({
            total: (0, drizzle_orm_1.sql) `SUM(${schema_1.attendanceRecords.overtimeMinutes}) as total`,
        })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.createdAt, new Date(monthStart)), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.createdAt, new Date(today))))
            .execute();
        const totalOvertimeMinutes = Number(overtimeAgg[0]?.total || 0);
        const overtimeThisMonth = `${Math.floor(totalOvertimeMinutes / 60)} hrs`;
        const topLateAgg = await this.db
            .select({
            employeeId: schema_1.attendanceRecords.employeeId,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.createdAt, new Date(monthStart)), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.createdAt, new Date(today)), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.isLateArrival, true)))
            .groupBy(schema_1.attendanceRecords.employeeId)
            .orderBy((0, drizzle_orm_1.sql) `COUNT(*) DESC`)
            .limit(5)
            .execute();
        const topLateArrivals = topLateAgg.map((entry) => {
            const emp = allEmployees.find((e) => e.id === entry.employeeId);
            return `${emp?.firstName ?? ''} ${emp?.lastName ?? ''} (${entry.count})`;
        });
        const deptMap = {};
        summaryList.forEach((e) => {
            deptMap[e.department] ??= { pres: 0, tot: 0 };
            if (e.status !== 'absent')
                deptMap[e.department].pres++;
            deptMap[e.department].tot++;
        });
        const departmentRates = Object.entries(deptMap).map(([dept, data]) => ({
            department: dept,
            rate: ((data.pres / data.tot) * 100).toFixed(2) + '%',
        }));
        const thirtyDaysAgo = (0, date_fns_1.format)((0, date_fns_1.subDays)(new Date(today), 29), 'yyyy-MM-dd');
        const recs30 = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.createdAt, new Date(thirtyDaysAgo)), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.createdAt, new Date(today))))
            .execute();
        const totalPossibleAttendance = allEmployees.length * 30;
        const absences = totalPossibleAttendance - recs30.length;
        const rolling30DayAbsenteeismRate = ((absences / totalPossibleAttendance) * 100).toFixed(2) + '%';
        return {
            details: {
                date: today,
                totalEmployees: allEmployees.length,
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                attendanceRate: (((presentCount + lateCount) / allEmployees.length) * 100).toFixed(2) + '%',
                averageCheckInTime,
            },
            summaryList,
            metrics: {
                attendanceChangePercent,
                lateChangePercent,
                averageCheckInTimeChange,
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
    async getDailySummaryList(companyId, date) {
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const workStartBoundary = new Date(targetDate);
        workStartBoundary.setHours(9, 0, 0, 0);
        function toDate(d) {
            if (!d)
                return null;
            return typeof d === 'string'
                ? new Date(d.replace(' ', 'T'))
                : new Date(d);
        }
        const employees = await this.employeesService.findAllEmployees(companyId);
        const allEmployees = employees.filter((emp) => emp.employmentStatus === 'active');
        const departments = await this.departmentsService.findAll(companyId);
        const attendance = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDay)))
            .execute();
        const summaryList = allEmployees.map((emp) => {
            const rec = attendance.find((r) => r.employeeId === emp.id);
            const dept = departments.find((d) => d.id === emp.departmentId);
            const ci = toDate(rec?.clockIn);
            const co = toDate(rec?.clockOut);
            const isLate = ci ? ci > workStartBoundary : false;
            let status = 'absent';
            if (ci)
                status = isLate ? 'late' : 'present';
            let totalWorkedMinutes = null;
            if (ci && co) {
                const diffMs = co.getTime() - ci.getTime();
                totalWorkedMinutes = Math.floor(diffMs / 1000 / 60);
            }
            return {
                employeeId: emp.id,
                employeeNumber: emp.employeeNumber,
                name: `${emp.firstName} ${emp.lastName}`,
                department: dept?.name ?? 'Unknown',
                checkInTime: ci?.toISOString() ?? null,
                checkOutTime: co?.toISOString() ?? null,
                status,
                totalWorkedMinutes,
            };
        });
        return summaryList;
    }
    async getMonthlyAttendanceSummary(companyId, yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month - 1, new Date(year, month, 0).getDate());
        const startOfMonthDay = new Date(start);
        startOfMonthDay.setHours(0, 0, 0, 0);
        const endOfMonthDay = new Date(end);
        endOfMonthDay.setHours(23, 59, 59, 999);
        const s = await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
        const useShifts = s['use_shifts'] ?? false;
        const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
        const defaultWorkingDays = Number(s['default_working_days'] ?? 5);
        const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
        const allowOvertime = Boolean(s['allow_overtime']);
        const overtimeRate = Number(s['overtime_rate'] ?? 1.0);
        const allHolidays = await this.db
            .select()
            .from(holidays_schema_1.holidays)
            .where((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, String(year)))
            .execute();
        const holidaySet = new Set(allHolidays.map((h) => h.date));
        const leaves = await this.leaveRequestService.findAll(companyId);
        const leaveMap = new Map();
        for (const lr of leaves) {
            const from = new Date(lr.startDate);
            const to = new Date(lr.endDate);
            for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
                const key = (0, date_fns_1.format)(d, 'yyyy-MM-dd');
                if (!leaveMap.has(lr.employeeId)) {
                    leaveMap.set(lr.employeeId, new Set());
                }
                leaveMap.get(lr.employeeId).add(key);
            }
        }
        const recs = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfMonthDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfMonthDay)))
            .execute();
        const attendanceMap = new Map();
        for (const rec of recs) {
            const dayKey = (0, date_fns_1.format)(rec.clockIn, 'yyyy-MM-dd');
            if (!attendanceMap.has(rec.employeeId)) {
                attendanceMap.set(rec.employeeId, new Map());
            }
            attendanceMap.get(rec.employeeId).set(dayKey, rec);
        }
        const emps = await this.employeesService.findAllEmployees(companyId);
        const allDates = (0, date_fns_1.eachDayOfInterval)({ start, end }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
        const results = [];
        for (const emp of emps) {
            let present = 0;
            let late = 0;
            let absent = 0;
            let onLeave = 0;
            let holidaysCount = 0;
            let penalties = 0;
            for (const dateKey of allDates) {
                if (defaultWorkingDays < 7) {
                    const dayName = (0, date_fns_1.format)((0, date_fns_1.parseISO)(dateKey), 'EEE');
                    const weekendDays = ['Sat', 'Sun'];
                    if (weekendDays.includes(dayName))
                        continue;
                }
                if (holidaySet.has(dateKey)) {
                    holidaysCount++;
                    continue;
                }
                if (leaveMap.get(emp.id)?.has(dateKey)) {
                    onLeave++;
                    continue;
                }
                const empMap = attendanceMap.get(emp.id) ?? new Map();
                const rec = empMap.get(dateKey);
                if (!rec || !rec.clockIn) {
                    absent++;
                    continue;
                }
                let { startTime, tolerance } = {
                    startTime: defaultStartTimeStr,
                    tolerance: lateToleranceMins,
                };
                if (useShifts) {
                    const shift = await this.employeeShiftsService.getActiveShiftForEmployee(emp.id, companyId, dateKey);
                    if (shift) {
                        startTime = shift.startTime;
                        tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
                    }
                }
                const shiftStart = (0, date_fns_1.parseISO)(`${dateKey}T${startTime}:00`);
                const checkIn = new Date(rec.clockIn);
                const diffMins = (checkIn.getTime() - shiftStart.getTime()) / 60000;
                if (diffMins <= tolerance) {
                    present++;
                }
                else {
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
    async getLast6MonthsAttendanceSummary(companyId) {
        const now = new Date();
        const summaries = [];
        const s = await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
        const useShifts = s['use_shifts'] ?? false;
        const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
        const defaultWorkingDays = Number(s['default_working_days'] ?? 5);
        const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
        const allEmployees = await this.employeesService.findAllEmployees(companyId);
        const leaves = await this.leaveRequestService.findAll(companyId);
        const leaveMap = new Map();
        for (const lr of leaves) {
            const from = new Date(lr.startDate);
            const to = new Date(lr.endDate);
            for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
                const key = (0, date_fns_1.format)(d, 'yyyy-MM-dd');
                if (!leaveMap.has(lr.employeeId))
                    leaveMap.set(lr.employeeId, new Set());
                leaveMap.get(lr.employeeId).add(key);
            }
        }
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = (0, date_fns_1.startOfMonth)(date);
            const end = (0, date_fns_1.endOfMonth)(date);
            const year = start.getFullYear();
            const month = (0, date_fns_1.format)(start, 'MMMM');
            const holidaysForYear = await this.db
                .select()
                .from(holidays_schema_1.holidays)
                .where((0, drizzle_orm_1.eq)(holidays_schema_1.holidays.year, String(year)))
                .execute();
            const holidaySet = new Set(holidaysForYear.map((h) => h.date));
            const recs = await this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, start), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, end)))
                .execute();
            const attendanceMap = new Map();
            for (const rec of recs) {
                const dayKey = (0, date_fns_1.format)(rec.clockIn, 'yyyy-MM-dd');
                if (!attendanceMap.has(rec.employeeId)) {
                    attendanceMap.set(rec.employeeId, new Map());
                }
                attendanceMap.get(rec.employeeId).set(dayKey, rec);
            }
            const allDates = (0, date_fns_1.eachDayOfInterval)({ start, end }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
            let present = 0;
            let late = 0;
            let absent = 0;
            for (const emp of allEmployees) {
                for (const dateKey of allDates) {
                    if (defaultWorkingDays < 7) {
                        const dayName = (0, date_fns_1.format)((0, date_fns_1.parseISO)(dateKey), 'EEE');
                        if (['Sat', 'Sun'].includes(dayName))
                            continue;
                    }
                    if (holidaySet.has(dateKey))
                        continue;
                    if (leaveMap.get(emp.id)?.has(dateKey))
                        continue;
                    const empMap = attendanceMap.get(emp.id) ?? new Map();
                    const rec = empMap.get(dateKey);
                    if (!rec || !rec.clockIn) {
                        absent++;
                        continue;
                    }
                    let startTime = defaultStartTimeStr;
                    let tolerance = lateToleranceMins;
                    if (useShifts) {
                        const shift = await this.employeeShiftsService.getActiveShiftForEmployee(emp.id, companyId, dateKey);
                        if (shift) {
                            startTime = shift.startTime;
                            tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
                        }
                    }
                    const shiftStart = (0, date_fns_1.parseISO)(`${dateKey}T${startTime}:00`);
                    const checkIn = new Date(rec.clockIn);
                    const diffMins = (checkIn.getTime() - shiftStart.getTime()) / 60000;
                    if (diffMins <= tolerance) {
                        present++;
                    }
                    else {
                        late++;
                    }
                }
            }
            summaries.push({ month, present, absent, late });
        }
        return summaries;
    }
    async getLateArrivalsReport(companyId, yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const lateArrivals = await this.db
            .select({
            employeeId: schema_1.attendanceRecords.employeeId,
            employeeNumber: schema_2.employees.employeeNumber,
            name: (0, drizzle_orm_1.sql) `${schema_2.employees.firstName} || ' ' || ${schema_2.employees.lastName}`,
            clockIn: schema_1.attendanceRecords.clockIn,
        })
            .from(schema_1.attendanceRecords)
            .innerJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, schema_2.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, start), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, end), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.isLateArrival, true)))
            .execute();
        return lateArrivals;
    }
    async getOvertimeReport(companyId, yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const overtimeRecords = await this.db
            .select({
            employeeId: schema_1.attendanceRecords.employeeId,
            clockIn: schema_1.attendanceRecords.clockIn,
            overtimeMinutes: schema_1.attendanceRecords.overtimeMinutes,
        })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, start), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, end), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.overtimeMinutes, 1)))
            .execute();
        return overtimeRecords;
    }
    async getAbsenteeismReport(companyId, startDate, endDate) {
        const startOfMonthDay = new Date(startDate);
        startOfMonthDay.setHours(0, 0, 0, 0);
        const endOfMonthDay = new Date(endDate);
        endOfMonthDay.setHours(23, 59, 59, 999);
        const allEmployees = await this.employeesService.findAllEmployees(companyId);
        const attendanceRecordsList = await this.db
            .select({
            employeeId: schema_1.attendanceRecords.employeeId,
            clockIn: schema_1.attendanceRecords.clockIn,
        })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfMonthDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfMonthDay)))
            .execute();
        const attendanceSet = new Set(attendanceRecordsList.map((rec) => `${rec.employeeId}-${rec.clockIn.toISOString().split('T')[0]}`));
        const days = (0, date_fns_1.eachDayOfInterval)({
            start: (0, date_fns_1.parseISO)(startDate),
            end: (0, date_fns_1.parseISO)(endDate),
        }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
        const absenteeismReport = [];
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
    async getDepartmentAttendanceSummary(companyId, yearMonth) {
        const [year, month] = yearMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const daysInMonth = end.getDate();
        const employees = await this.employeesService.findAllEmployees(companyId);
        const departments = await this.departmentsService.findAll(companyId);
        const recs = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, start), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, end)))
            .execute();
        const recordsByEmployee = {};
        for (const rec of recs) {
            const dateStr = new Date(rec.clockIn).toDateString();
            if (!recordsByEmployee[rec.employeeId]) {
                recordsByEmployee[rec.employeeId] = new Set();
            }
            recordsByEmployee[rec.employeeId].add(dateStr);
        }
        const departmentMap = {};
        for (const emp of employees) {
            const deptName = departments.find((d) => d.id === emp.departmentId)?.name ?? 'Unknown';
            departmentMap[deptName] ??= { present: 0, absent: 0, total: 0 };
            const presentDays = recordsByEmployee[emp.id]?.size || 0;
            const absentDays = daysInMonth - presentDays;
            departmentMap[deptName].present += presentDays;
            departmentMap[deptName].absent += absentDays;
            departmentMap[deptName].total += daysInMonth;
        }
        return departmentMap;
    }
    async getCombinedAttendanceReports(companyId, yearMonth, startDate, endDate) {
        const today = new Date().toISOString().split('T')[0];
        const ym = yearMonth ?? today.slice(0, 7);
        const defaultStart = new Date(Date.now() - 7 * 86400000)
            .toISOString()
            .split('T')[0];
        const start = startDate ?? defaultStart;
        const end = endDate ?? today;
        const [dailySummary, monthlySummary, lateArrivals, overtime, absenteeism, departmentSummary,] = await Promise.all([
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
    async getShiftDashboardSummaryByMonth(companyId, yearMonth, filters) {
        const from = `${yearMonth}-01`;
        const to = new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.employeeShifts.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.employeeShifts.isDeleted, false),
            (0, drizzle_orm_1.gte)(schema_1.employeeShifts.shiftDate, from),
            (0, drizzle_orm_1.lte)(schema_1.employeeShifts.shiftDate, to),
        ];
        if (filters?.locationId) {
            conditions.push((0, drizzle_orm_1.eq)(schema_1.shifts.locationId, filters.locationId));
        }
        if (filters?.departmentId) {
            conditions.push((0, drizzle_orm_1.eq)(schema_2.employees.departmentId, filters.departmentId));
        }
        const [summary, breakdown] = await Promise.all([
            this.db
                .select({
                yearMonth: (0, drizzle_orm_1.sql) `TO_CHAR(${schema_1.employeeShifts.shiftDate}, 'YYYY-MM')`.as('yearMonth'),
                totalShifts: (0, drizzle_orm_1.sql) `COUNT(*)`.as('totalShifts'),
                uniqueEmployees: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.employeeShifts.employeeId})`.as('uniqueEmployees'),
                uniqueShiftTypes: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.employeeShifts.shiftId})`.as('uniqueShiftTypes'),
            })
                .from(schema_1.employeeShifts)
                .leftJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_2.employees.id, schema_1.employeeShifts.employeeId))
                .leftJoin(schema_1.shifts, (0, drizzle_orm_1.eq)(schema_1.shifts.id, schema_1.employeeShifts.shiftId))
                .where((0, drizzle_orm_1.and)(...conditions))
                .groupBy((0, drizzle_orm_1.sql) `TO_CHAR(${schema_1.employeeShifts.shiftDate}, 'YYYY-MM')`)
                .execute(),
            this.db
                .select({
                employeeId: schema_1.employeeShifts.employeeId,
                employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_2.employees.firstName}, ' ', ${schema_2.employees.lastName})`,
                shiftName: schema_1.shifts.name,
                locationName: schema_2.companyLocations.name,
                startTime: schema_1.shifts.startTime,
                endTime: schema_1.shifts.endTime,
                daysScheduled: (0, drizzle_orm_1.sql) `COUNT(*)`,
                daysPresent: (0, drizzle_orm_1.sql) `COUNT(${schema_1.attendanceRecords.id})`,
            })
                .from(schema_1.employeeShifts)
                .leftJoin(schema_2.employees, (0, drizzle_orm_1.eq)(schema_2.employees.id, schema_1.employeeShifts.employeeId))
                .leftJoin(schema_1.shifts, (0, drizzle_orm_1.eq)(schema_1.shifts.id, schema_1.employeeShifts.shiftId))
                .leftJoin(schema_1.attendanceRecords, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, schema_1.employeeShifts.employeeId), (0, drizzle_orm_1.eq)((0, drizzle_orm_1.sql) `${schema_1.attendanceRecords.createdAt}::date`, schema_1.employeeShifts.shiftDate), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId)))
                .leftJoin(schema_2.companyLocations, (0, drizzle_orm_1.eq)(schema_2.companyLocations.id, schema_1.shifts.locationId))
                .where((0, drizzle_orm_1.and)(...conditions))
                .groupBy(schema_1.employeeShifts.employeeId, schema_2.employees.firstName, schema_2.employees.lastName, schema_1.shifts.name, schema_1.shifts.startTime, schema_1.shifts.endTime, schema_2.companyLocations.name)
                .execute(),
        ]);
        const allDates = (0, date_fns_1.eachDayOfInterval)({
            start: (0, date_fns_1.parseISO)(from),
            end: (0, date_fns_1.parseISO)(to),
        });
        const workdays = allDates.filter((d) => !(0, date_fns_1.isWeekend)(d)).length;
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
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, attendance_settings_service_1.AttendanceSettingsService,
        employee_shifts_service_1.EmployeeShiftsService,
        employees_service_1.EmployeesService,
        leave_request_service_1.LeaveRequestService,
        department_service_1.DepartmentService])
], ReportService);
//# sourceMappingURL=report.service.js.map