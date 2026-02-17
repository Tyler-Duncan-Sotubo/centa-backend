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
exports.BreaksService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const date_fns_tz_1 = require("date-fns-tz");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const employees_service_1 = require("../../core/employees/employees.service");
const cache_service_1 = require("../../../common/cache/cache.service");
const attendance_location_service_1 = require("./attendance-location.service");
let BreaksService = class BreaksService {
    constructor(db, employeesService, cache, location) {
        this.db = db;
        this.employeesService = employeesService;
        this.cache = cache;
        this.location = location;
    }
    tags(companyId) {
        return [
            `company:${companyId}:attendance`,
            `company:${companyId}:attendance:records`,
            `company:${companyId}:attendance:dashboards`,
        ];
    }
    getTodayWindow(tz) {
        const localDate = (0, date_fns_tz_1.formatInTimeZone)(new Date(), tz, 'yyyy-MM-dd');
        const startOfDayUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T00:00:00.000`, tz);
        const endOfDayUtc = (0, date_fns_tz_1.fromZonedTime)(`${localDate}T23:59:59.999`, tz);
        return { localDate, startOfDayUtc, endOfDayUtc };
    }
    async getTodayAttendance(employeeId, companyId, tz) {
        const { startOfDayUtc, endOfDayUtc } = this.getTodayWindow(tz);
        const [attendance] = await this.db
            .select()
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.employeeId, employeeId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.companyId, companyId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockIn, startOfDayUtc), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockIn, endOfDayUtc)))
            .limit(1)
            .execute();
        return attendance;
    }
    async startBreak(user, latitude, longitude, tz) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const zone = this.location.pickTz(tz ?? 'Africa/Lagos');
        const attendance = await this.getTodayAttendance(employee.id, user.companyId, zone);
        if (!attendance)
            throw new common_1.BadRequestException('You have not clocked in today.');
        if (attendance.clockOut)
            throw new common_1.BadRequestException('You have already clocked out.');
        await this.location.checkLocation(latitude, longitude, employee);
        const [open] = await this.db
            .select({ id: schema_1.attendanceBreaks.id })
            .from(schema_1.attendanceBreaks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.attendanceRecordId, attendance.id), (0, drizzle_orm_1.isNull)(schema_1.attendanceBreaks.breakEnd)))
            .limit(1)
            .execute();
        if (open)
            throw new common_1.BadRequestException('You are already on a break.');
        const now = new Date();
        await this.db
            .insert(schema_1.attendanceBreaks)
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
    async endBreak(user, latitude, longitude, tz) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const zone = this.location.pickTz(tz ?? 'Africa/Lagos');
        const attendance = await this.getTodayAttendance(employee.id, user.companyId, zone);
        if (!attendance)
            throw new common_1.BadRequestException('You have not clocked in today.');
        if (attendance.clockOut)
            throw new common_1.BadRequestException('You have already clocked out.');
        await this.location.checkLocation(latitude, longitude, employee);
        const [open] = await this.db
            .select()
            .from(schema_1.attendanceBreaks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.attendanceRecordId, attendance.id), (0, drizzle_orm_1.isNull)(schema_1.attendanceBreaks.breakEnd)))
            .limit(1)
            .execute();
        if (!open)
            throw new common_1.BadRequestException('You are not currently on a break.');
        const now = new Date();
        const mins = Math.max(0, Math.floor((now.getTime() - new Date(open.breakStart).getTime()) / 60000));
        await this.db
            .update(schema_1.attendanceBreaks)
            .set({
            breakEnd: now,
            durationMinutes: mins,
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.id, open.id))
            .execute();
        await this.cache.bumpCompanyVersion(user.companyId);
        return 'Break ended.';
    }
    async getBreakStatus(user, tz) {
        const employee = await this.employeesService.findOneByUserId(user.id);
        const zone = this.location.pickTz(tz ?? 'Africa/Lagos');
        const attendance = await this.getTodayAttendance(employee.id, user.companyId, zone);
        if (!attendance)
            return { onBreak: false, breakStart: null };
        const [open] = await this.db
            .select({ breakStart: schema_1.attendanceBreaks.breakStart })
            .from(schema_1.attendanceBreaks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.companyId, user.companyId), (0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.attendanceRecordId, attendance.id), (0, drizzle_orm_1.isNull)(schema_1.attendanceBreaks.breakEnd)))
            .limit(1)
            .execute();
        return { onBreak: !!open, breakStart: open?.breakStart ?? null };
    }
    async getTotalBreakMinutes(companyId, attendanceRecordId) {
        const rows = await this.db
            .select({ durationMinutes: schema_1.attendanceBreaks.durationMinutes })
            .from(schema_1.attendanceBreaks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.attendanceBreaks.attendanceRecordId, attendanceRecordId)))
            .execute();
        return rows.reduce((sum, r) => sum + (r.durationMinutes ?? 0), 0);
    }
};
exports.BreaksService = BreaksService;
exports.BreaksService = BreaksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, employees_service_1.EmployeesService,
        cache_service_1.CacheService,
        attendance_location_service_1.AttendanceLocationService])
], BreaksService);
//# sourceMappingURL=breaks.service.js.map