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
exports.ClockInOutService = void 0;
const common_1 = require("@nestjs/common");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const employees_service_1 = require("../../core/employees/employees.service");
const attendance_settings_service_1 = require("../settings/attendance-settings.service");
const employee_shifts_service_1 = require("../employee-shifts/employee-shifts.service");
const report_service_1 = require("../report/report.service");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const cache_service_1 = require("../../../common/cache/cache.service");
let ClockInOutService = class ClockInOutService {
    constructor(db, auditService, employeesService, attendanceSettingsService, employeeShiftsService, reportService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.employeesService = employeesService;
        this.attendanceSettingsService = attendanceSettingsService;
        this.employeeShiftsService = employeeShiftsService;
        this.reportService = reportService;
        this.cache = cache;
        this.settingsMemo = new Map();
    }
    tags(companyId) {
        return [
            `company:${companyId}:attendance`,
            `company:${companyId}:attendance:records`,
            `company:${companyId}:attendance:dashboards`,
        ];
    }
    pickTz(tz) {
        try {
            if (tz) {
                (0, date_fns_tz_1.fromZonedTime)('2000-01-01T00:00:00', tz);
                return tz;
            }
        }
        catch { }
        return process.env.DEFAULT_TZ || 'Africa/Lagos';
    }
    isWithinRadius(lat1, lon1, lat2, lon2, radiusInKm = 0.1) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c <= radiusInKm;
    }
    getTodayWindow(tz) {
        const localDate = (0, date_fns_tz_1.formatInTimeZone)(new Date(), tz, 'yyyy-MM-dd');
        const startOfDayUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T00:00:00.000`, tz);
        const endOfDayUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T23:59:59.999`, tz);
        return { localDate, startOfDayUtc, endOfDayUtc };
    }
    async getSettings(companyId) {
        const cached = this.settingsMemo.get(companyId);
        if (cached)
            return cached;
        const s = await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
        this.settingsMemo.set(companyId, s);
        return s;
    }
    async checkLocation(latitude, longitude, employee) {
        if (!employee)
            throw new common_1.BadRequestException('Employee not found');
        const lat = Number(latitude);
        const lon = Number(longitude);
        if (employee.locationId) {
            const officeLocation = await this.cache.getOrSetVersioned(employee.companyId, ['attendance', 'locations', 'one', employee.locationId], async () => {
                const [loc] = await this.db
                    .select()
                    .from(schema_1.companyLocations)
                    .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.id, employee.locationId))
                    .limit(1)
                    .execute();
                return loc ?? null;
            }, { ttlSeconds: 300, tags: this.tags(employee.companyId) });
            if (!officeLocation) {
                throw new common_1.BadRequestException('Assigned office location not found');
            }
            if (!this.isWithinRadius(lat, lon, Number(officeLocation.latitude), Number(officeLocation.longitude))) {
                throw new common_1.BadRequestException('You are not at your assigned office location.');
            }
        }
        else {
            const officeLocations = await this.cache.getOrSetVersioned(employee.companyId, ['attendance', 'locations', 'all'], async () => this.db
                .select()
                .from(schema_1.companyLocations)
                .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, employee.companyId))
                .execute(), { ttlSeconds: 300, tags: this.tags(employee.companyId) });
            const ok = officeLocations.some((loc) => this.isWithinRadius(lat, lon, Number(loc.latitude), Number(loc.longitude)));
            if (!ok) {
                throw new common_1.BadRequestException('You are not at a valid company location.');
            }
        }
    }
    async clockIn(user, dto) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const tz = this.pickTz(dto.tz ?? 'Africa/Lagos');
        const now = new Date();
        const { localDate, startOfDayUtc, endOfDayUtc } = this.getTodayWindow(tz);
        const [existing] = await this.db
            .select({ id: schema_1.attendanceRecords.id })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employee.id), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, user.companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDayUtc), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDayUtc)))
            .limit(1)
            .execute();
        if (existing)
            throw new common_1.BadRequestException('You have already clocked in today.');
        await this.checkLocation(dto.latitude, dto.longitude, employee);
        const settings = await this.getSettings(user.companyId);
        const useShifts = settings['use_shifts'] ?? false;
        const forceClockIn = dto.forceClockIn ?? false;
        if (useShifts) {
            const shift = await this.employeeShiftsService.getActiveShiftForEmployee(employee.id, user.companyId, localDate);
            if (!shift && !forceClockIn) {
                throw new common_1.BadRequestException('You do not have an active shift assigned today.');
            }
            if (shift) {
                const shiftStartUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T${shift.startTime}`, tz);
                if (shift.allowEarlyClockIn) {
                    const earliest = new Date(shiftStartUtc.getTime() - (shift.earlyClockInMinutes ?? 0) * 60000);
                    if (now < earliest && !forceClockIn) {
                        throw new common_1.BadRequestException('You are clocking in too early.');
                    }
                }
                else if (now < shiftStartUtc && !forceClockIn) {
                    throw new common_1.BadRequestException('You cannot clock in before your shift start time.');
                }
            }
        }
        else {
            const startTime = settings['default_start_time'] ?? '09:00';
            const earlyWindow = parseInt(settings['early_clockIn_window_minutes'] ?? '15', 10);
            const earliest = new Date((0, date_fns_tz_1.fromZonedTime)(`${localDate}T${startTime}:00`, tz).getTime() -
                earlyWindow * 60000);
            if (now < earliest && !forceClockIn) {
                throw new common_1.BadRequestException('You are clocking in too early.');
            }
        }
        await this.db
            .insert(schema_1.attendanceRecords)
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
    async clockOut(user, latitude, longitude, tz) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const zone = this.pickTz(tz ?? 'Africa/Lagos');
        const { localDate, startOfDayUtc, endOfDayUtc } = this.getTodayWindow(zone);
        const now = new Date();
        const [attendance] = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employee.id), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, user.companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDayUtc), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDayUtc)))
            .limit(1)
            .execute();
        if (!attendance)
            throw new common_1.BadRequestException('You have not clocked in today.');
        if (attendance.clockOut)
            throw new common_1.BadRequestException('You have already clocked out.');
        await this.checkLocation(latitude, longitude, employee);
        const checkInTime = new Date(attendance.clockIn);
        const workDurationMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
        const s = await this.getSettings(user.companyId);
        const useShifts = s['use_shifts'] ?? false;
        let isLateArrival = false;
        let isEarlyDeparture = false;
        let overtimeMinutes = 0;
        if (useShifts) {
            const shift = await this.employeeShiftsService.getActiveShiftForEmployee(employee.id, user.companyId, localDate);
            if (shift) {
                const shiftStartUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T${shift.startTime}`, zone);
                const shiftEndUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T${shift.endTime}`, zone);
                const tol = shift.lateToleranceMinutes ?? 10;
                if (checkInTime.getTime() > shiftStartUtc.getTime() + tol * 60000)
                    isLateArrival = true;
                if (now.getTime() < shiftEndUtc.getTime())
                    isEarlyDeparture = true;
                if (now.getTime() > shiftEndUtc.getTime()) {
                    overtimeMinutes = Math.floor((now.getTime() - shiftEndUtc.getTime()) / 60000);
                }
            }
        }
        else {
            const startTime = s['default_start_time'] ?? '09:00';
            const endTime = s['default_end_time'] ?? '17:00';
            const tol = parseInt(s['late_tolerance_minutes'] ?? '10', 10);
            const startUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T${startTime}:00`, zone);
            const endUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T${endTime}:00`, zone);
            if (checkInTime.getTime() > startUtc.getTime() + tol * 60000)
                isLateArrival = true;
            if (now.getTime() < endUtc.getTime())
                isEarlyDeparture = true;
            if (now.getTime() > endUtc.getTime()) {
                overtimeMinutes = Math.floor((now.getTime() - endUtc.getTime()) / 60000);
            }
        }
        await this.db
            .update(schema_1.attendanceRecords)
            .set({
            clockOut: now,
            workDurationMinutes,
            overtimeMinutes: overtimeMinutes ?? 0,
            isLateArrival,
            isEarlyDeparture,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, attendance.id))
            .execute();
        await this.cache.bumpCompanyVersion(user.companyId);
        return 'Clocked out successfully.';
    }
    async getAttendanceStatus(employeeId, companyId, tz) {
        const zone = this.pickTz(tz ?? 'Africa/Lagos');
        const todayLocal = (0, date_fns_tz_1.formatInTimeZone)(new Date(), zone, 'yyyy-MM-dd');
        const startOfDayUtc = (0, date_fns_tz_1.fromZonedTime)(`${todayLocal}T00:00:00.000`, zone);
        const endOfDayUtc = (0, date_fns_tz_1.fromZonedTime)(`${todayLocal}T23:59:59.999`, zone);
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'status', employeeId, todayLocal], async () => {
            const [attendance] = await this.db
                .select({
                clockIn: schema_1.attendanceRecords.clockIn,
                clockOut: schema_1.attendanceRecords.clockOut,
            })
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDayUtc), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDayUtc)))
                .limit(1)
                .execute();
            if (!attendance)
                return { status: 'absent' };
            return {
                status: 'present',
                checkInTime: attendance.clockIn,
                checkOutTime: attendance.clockOut ?? null,
            };
        });
    }
    async getDailyDashboardStats(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'dashboard', 'daily'], async () => {
            const summary = await this.reportService.getDailyAttendanceSummary(companyId);
            const { details, summaryList, metrics, dashboard } = summary;
            return { details, summaryList, metrics, ...dashboard };
        });
    }
    async getDailyDashboardStatsByDate(companyId, date) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'dashboard', 'daily', date], async () => {
            const summary = await this.reportService.getDailySummaryList(companyId, date);
            return { summaryList: summary };
        });
    }
    async getMonthlyDashboardStats(companyId, yearMonth) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'dashboard', 'monthly', yearMonth], async () => {
            const detailed = await this.reportService.getMonthlyAttendanceSummary(companyId, yearMonth);
            const totalEmployees = detailed.length;
            const [y, m] = yearMonth.split('-').map(Number);
            const daysInMonth = new Date(y, m, 0).getDate();
            const sums = detailed.reduce((acc, r) => {
                acc.present += r.present;
                acc.late += r.late;
                acc.absent += r.absent;
                return acc;
            }, { present: 0, late: 0, absent: 0 });
            const attendanceRate = (((sums.present + sums.late) /
                (Math.max(totalEmployees, 1) * daysInMonth)) *
                100).toFixed(2) + '%';
            return {
                month: yearMonth,
                totalEmployees,
                attendanceRate,
                avgLatePerEmployee: +(sums.late / Math.max(totalEmployees, 1)).toFixed(2),
                avgAbsentPerEmployee: +(sums.absent / Math.max(totalEmployees, 1)).toFixed(2),
            };
        });
    }
    async getEmployeeAttendanceByDate(employeeId, companyId, date) {
        const target = new Date(date).toISOString().split('T')[0];
        const startOfDay = new Date(`${target}T00:00:00.000Z`);
        const endOfDay = new Date(`${target}T23:59:59.999Z`);
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee', employeeId, 'by-date', target], async () => {
            const s = await this.getSettings(companyId);
            const useShifts = s['use_shifts'] ?? false;
            const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
            const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
            const endDefault = s['default_end_time'] ?? '17:00';
            const [rec] = await this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDay)))
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
                const shift = await this.employeeShiftsService.getActiveShiftForEmployee(employeeId, companyId, target);
                if (shift) {
                    startTimeStr = shift.startTime;
                    endTimeStr = shift.endTime;
                    tolerance = shift.lateToleranceMinutes ?? lateToleranceMins;
                }
            }
            const shiftStart = (0, date_fns_1.parseISO)(`${target}T${startTimeStr}:00`);
            const shiftEnd = (0, date_fns_1.parseISO)(`${target}T${endTimeStr}:00`);
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
        });
    }
    async getEmployeeAttendanceByMonth(employeeId, companyId, yearMonth) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee', employeeId, 'by-month-fast', yearMonth], async () => {
            const [y, m] = yearMonth.split('-').map(Number);
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m - 1, new Date(y, m, 0).getDate());
            const allDays = (0, date_fns_1.eachDayOfInterval)({ start, end }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
            const todayStr = new Date().toISOString().split('T')[0];
            const days = allDays.filter((d) => d <= todayStr);
            const recs = await this.db
                .select({
                id: schema_1.attendanceRecords.id,
                clockIn: schema_1.attendanceRecords.clockIn,
                clockOut: schema_1.attendanceRecords.clockOut,
                workDurationMinutes: schema_1.attendanceRecords.workDurationMinutes,
                overtimeMinutes: schema_1.attendanceRecords.overtimeMinutes,
            })
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, new Date(y, m - 1, 1)), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, new Date(y, m - 1, new Date(y, m, 0).getDate(), 23, 59, 59, 999))))
                .execute();
            const byDay = new Map();
            for (const r of recs) {
                const key = r.clockIn.toISOString().split('T')[0];
                if (!byDay.has(key))
                    byDay.set(key, r);
            }
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
                        status: 'absent',
                    };
                }
                const startStr = defaultStart;
                const tol = defaultTol;
                const shiftStart = (0, date_fns_1.parseISO)(`${dateKey}T${startStr}:00`);
                const checkIn = new Date(rec.clockIn);
                const diffLate = (checkIn.getTime() - shiftStart.getTime()) / 60000;
                const status = diffLate > tol ? 'late' : 'present';
                return {
                    date: dateKey,
                    checkInTime: checkIn.toTimeString().slice(0, 8),
                    checkOutTime: rec.clockOut
                        ? new Date(rec.clockOut).toTimeString().slice(0, 8)
                        : null,
                    status,
                };
            });
            return { summaryList: out.reverse() };
        });
    }
    async adjustAttendanceRecord(dto, attendanceRecordId, user, ip) {
        await this.db
            .insert(schema_1.attendanceAdjustments)
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
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, attendanceRecordId))
            .limit(1)
            .execute();
        if (!attendanceRecord)
            throw new common_1.BadRequestException('Attendance record not found.');
        await this.db
            .update(schema_1.attendanceRecords)
            .set({
            clockIn: dto.adjustedClockIn
                ? new Date(dto.adjustedClockIn)
                : schema_1.attendanceRecords.clockIn,
            clockOut: dto.adjustedClockOut
                ? new Date(dto.adjustedClockOut)
                : schema_1.attendanceRecords.clockOut,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, attendanceRecordId))
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
};
exports.ClockInOutService = ClockInOutService;
exports.ClockInOutService = ClockInOutService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        employees_service_1.EmployeesService,
        attendance_settings_service_1.AttendanceSettingsService,
        employee_shifts_service_1.EmployeeShiftsService,
        report_service_1.ReportService,
        cache_service_1.CacheService])
], ClockInOutService);
//# sourceMappingURL=clock-in-out.service.js.map