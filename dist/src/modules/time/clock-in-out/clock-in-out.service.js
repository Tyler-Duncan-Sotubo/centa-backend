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
    }
    tags(companyId) {
        return [
            `company:${companyId}:attendance`,
            `company:${companyId}:attendance:records`,
            `company:${companyId}:attendance:dashboards`,
        ];
    }
    isWithinRadius(lat1, lon1, lat2, lon2, radiusInKm = 0.1) {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= radiusInKm;
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
                    .execute();
                return loc ?? null;
            }, { ttlSeconds: 60 * 5, tags: this.tags(employee.companyId) });
            if (!officeLocation) {
                throw new common_1.BadRequestException('Assigned office location not found');
            }
            const ok = this.isWithinRadius(lat, lon, Number(officeLocation.latitude), Number(officeLocation.longitude), 0.1);
            if (!ok) {
                throw new common_1.BadRequestException('You are not at your assigned office location.');
            }
        }
        else {
            const officeLocations = await this.cache.getOrSetVersioned(employee.companyId, ['attendance', 'locations', 'all'], async () => {
                return this.db
                    .select()
                    .from(schema_1.companyLocations)
                    .where((0, drizzle_orm_1.eq)(schema_1.companyLocations.companyId, employee.companyId))
                    .execute();
            }, { ttlSeconds: 60 * 5, tags: this.tags(employee.companyId) });
            const ok = officeLocations.some((loc) => this.isWithinRadius(lat, lon, Number(loc.latitude), Number(loc.longitude), 0.1));
            if (!ok) {
                throw new common_1.BadRequestException('You are not at a valid company location.');
            }
        }
    }
    async clockIn(user, dto) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const currentDate = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);
        const forceClockIn = dto.forceClockIn ?? false;
        const existingAttendance = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employee.id), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, user.companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDay)))
            .execute();
        if (existingAttendance.length > 0) {
            throw new common_1.BadRequestException('You have already clocked in today.');
        }
        await this.checkLocation(dto.latitude, dto.longitude, employee);
        const attendanceSettings = await this.attendanceSettingsService.getAllAttendanceSettings(user.companyId);
        const useShifts = attendanceSettings['use_shifts'] ?? false;
        const earlyClockInMinutes = parseInt(attendanceSettings['early_clockIn_window_minutes'] ?? '15');
        if (useShifts) {
            const assignedShift = await this.employeeShiftsService.getActiveShiftForEmployee(employee.id, user.companyId, currentDate);
            if (!assignedShift && !forceClockIn) {
                throw new common_1.BadRequestException('You do not have an active shift assigned today.');
            }
            if (assignedShift && !assignedShift.allowEarlyClockIn) {
                const shiftStartTime = new Date(`${currentDate}T${assignedShift.startTime}`);
                if (now < shiftStartTime && !forceClockIn) {
                    throw new common_1.BadRequestException('You cannot clock in before your shift start time.');
                }
            }
            else if (assignedShift && assignedShift.allowEarlyClockIn) {
                const shiftStartTime = new Date(`${currentDate}T${assignedShift.startTime}`);
                const earliestAllowedClockIn = new Date(shiftStartTime.getTime() -
                    (assignedShift.earlyClockInMinutes ?? 0) * 60000);
                if (now < earliestAllowedClockIn && !forceClockIn) {
                    throw new common_1.BadRequestException('You are clocking in too early according to your shift rules.');
                }
            }
        }
        else {
            const startTime = attendanceSettings['default_start_time'] ?? '09:00';
            const earliestAllowed = new Date(`${currentDate}T${startTime}:00`);
            earliestAllowed.setMinutes(earliestAllowed.getMinutes() - earlyClockInMinutes);
            if (now < earliestAllowed && !forceClockIn) {
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
    async clockOut(user, latitude, longitude) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const currentDate = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startOfDay = new Date(`${currentDate}T00:00:00.000Z`);
        const endOfDay = new Date(`${currentDate}T23:59:59.999Z`);
        const [attendance] = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employee.id), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, user.companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDay)))
            .execute();
        if (!attendance)
            throw new common_1.BadRequestException('You have not clocked in today.');
        if (attendance.clockOut)
            throw new common_1.BadRequestException('You have already clocked out.');
        await this.checkLocation(latitude, longitude, employee);
        const checkInTime = new Date(attendance.clockIn);
        const workedMilliseconds = now.getTime() - checkInTime.getTime();
        const workDurationMinutes = Math.floor(workedMilliseconds / 60000);
        const attendanceSettings = await this.attendanceSettingsService.getAllAttendanceSettings(user.companyId);
        const useShifts = attendanceSettings['use_shifts'] ?? false;
        let isLateArrival = false;
        let isEarlyDeparture = false;
        let overtimeMinutes = 0;
        if (useShifts) {
            const assignedShift = await this.employeeShiftsService.getActiveShiftForEmployee(employee.id, user.companyId, currentDate);
            if (assignedShift) {
                const shiftStart = new Date(`${currentDate}T${assignedShift.startTime}`);
                const shiftEnd = new Date(`${currentDate}T${assignedShift.endTime}`);
                const lateTolerance = assignedShift.lateToleranceMinutes ?? 10;
                if (checkInTime.getTime() >
                    shiftStart.getTime() + lateTolerance * 60000) {
                    isLateArrival = true;
                }
                if (now.getTime() < shiftEnd.getTime()) {
                    isEarlyDeparture = true;
                }
                if (now.getTime() > shiftEnd.getTime()) {
                    overtimeMinutes = Math.floor((now.getTime() - shiftEnd.getTime()) / 60000);
                }
            }
        }
        else {
            const startTime = attendanceSettings['default_start_time'] ?? '09:00';
            const endTime = attendanceSettings['default_end_time'] ?? '17:00';
            const lateTolerance = parseInt(attendanceSettings['late_tolerance_minutes'] ?? '10');
            const startDateTime = new Date(`${currentDate}T${startTime}:00`);
            const endDateTime = new Date(`${currentDate}T${endTime}:00`);
            if (checkInTime.getTime() >
                startDateTime.getTime() + lateTolerance * 60000) {
                isLateArrival = true;
            }
            if (now.getTime() < endDateTime.getTime()) {
                isEarlyDeparture = true;
            }
            if (now.getTime() > endDateTime.getTime()) {
                overtimeMinutes = Math.floor((now.getTime() - endDateTime.getTime()) / 60000);
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
    async getAttendanceStatus(employeeId, companyId) {
        const today = new Date().toISOString().split('T')[0];
        const startOfDay = new Date(`${today}T00:00:00.000Z`);
        const endOfDay = new Date(`${today}T23:59:59.999Z`);
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'status', employeeId, today], async () => {
            const [attendance] = await this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDay)))
                .execute();
            if (!attendance)
                return { status: 'absent' };
            const checkInTime = attendance.clockIn;
            const checkOutTime = attendance.clockOut ?? null;
            return {
                status: 'present',
                checkInTime,
                checkOutTime,
            };
        });
    }
    async getDailyDashboardStats(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'dashboard', 'daily'], async () => {
            const summary = await this.reportService.getDailyAttendanceSummary(companyId);
            const { details, summaryList, metrics, dashboard } = summary;
            return {
                details,
                summaryList,
                metrics,
                ...dashboard,
            };
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
            const attendanceRate = (((sums.present + sums.late) / (totalEmployees * daysInMonth)) *
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
            const s = await this.attendanceSettingsService.getAllAttendanceSettings(companyId);
            const useShifts = s['use_shifts'] ?? false;
            const defaultStartTimeStr = s['default_start_time'] ?? '09:00';
            const lateToleranceMins = Number(s['late_tolerance_minutes'] ?? 10);
            const recs = await this.db
                .select()
                .from(schema_1.attendanceRecords)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDay), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDay)))
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
            let startTimeStr = defaultStartTimeStr;
            let tolerance = lateToleranceMins;
            let endTimeStr = s['default_end_time'] ?? '17:00';
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
        return this.cache.getOrSetVersioned(companyId, ['attendance', 'employee', employeeId, 'by-month', yearMonth], async () => {
            const [y, m] = yearMonth.split('-').map(Number);
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m - 1, new Date(y, m, 0).getDate());
            const allDays = (0, date_fns_1.eachDayOfInterval)({ start, end }).map((d) => (0, date_fns_1.format)(d, 'yyyy-MM-dd'));
            const todayStr = new Date().toISOString().split('T')[0];
            const days = allDays.filter((d) => d <= todayStr);
            const summaryList = await Promise.all(days.map(async (dateKey) => {
                const day = await this.getEmployeeAttendanceByDate(employeeId, companyId, dateKey);
                return {
                    date: dateKey,
                    checkInTime: day.checkInTime,
                    checkOutTime: day.checkOutTime,
                    status: day.status,
                };
            }));
            return { summaryList: summaryList.reverse() };
        });
    }
    async adjustAttendanceRecord(dto, attendanceRecordId, user, ip) {
        await this.db
            .insert(schema_1.attendanceAdjustments)
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
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, attendanceRecordId))
            .execute();
        if (!attendanceRecord) {
            throw new common_1.BadRequestException('Attendance record not found.');
        }
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