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
exports.ClockInOutController = void 0;
const common_1 = require("@nestjs/common");
const clock_in_out_service_1 = require("./clock-in-out.service");
const create_clock_in_out_dto_1 = require("./dto/create-clock-in-out.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const adjust_attendance_dto_1 = require("./dto/adjust-attendance.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let ClockInOutController = class ClockInOutController extends base_controller_1.BaseController {
    constructor(clockInOutService) {
        super();
        this.clockInOutService = clockInOutService;
    }
    async clockIn(dto, user) {
        return this.clockInOutService.clockIn(user, dto);
    }
    async clockOut(dto, user) {
        return this.clockInOutService.clockOut(user, dto.latitude, dto.longitude);
    }
    async getAttendanceStatus(user, employeeId) {
        return this.clockInOutService.getAttendanceStatus(employeeId, user.companyId);
    }
    async getDailyDashboardStatsByDate(user, date) {
        return this.clockInOutService.getDailyDashboardStatsByDate(user.companyId, date);
    }
    async getDailyDashboardStats(user) {
        return this.clockInOutService.getDailyDashboardStats(user.companyId);
    }
    async monthlyStats(yearMonth, user) {
        return this.clockInOutService.getMonthlyDashboardStats(user.companyId, yearMonth);
    }
    async getEmployeeAttendance(employeeId, yearMonth, user) {
        return this.clockInOutService.getEmployeeAttendanceByDate(employeeId, user.companyId, yearMonth);
    }
    async getEmployeeAttendanceByMonth(employeeId, yearMonth, user) {
        return this.clockInOutService.getEmployeeAttendanceByMonth(employeeId, user.companyId, yearMonth);
    }
    async adjustAttendance(attendanceRecordId, dto, user, ip) {
        return this.clockInOutService.adjustAttendanceRecord(dto, attendanceRecordId, user, ip);
    }
};
exports.ClockInOutController = ClockInOutController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.clockin']),
    (0, common_1.Post)('clock-in'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_clock_in_out_dto_1.CreateClockInOutDto, Object]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "clockIn", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.clockout']),
    (0, common_1.Post)('clock-out'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_clock_in_out_dto_1.CreateClockInOutDto, Object]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "clockOut", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.clockin']),
    (0, common_1.Get)('status/:employeeId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "getAttendanceStatus", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.read']),
    (0, common_1.Get)('attendance-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "getDailyDashboardStatsByDate", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.read']),
    (0, common_1.Get)('daily-dashboard-stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "getDailyDashboardStats", null);
__decorate([
    (0, common_1.Get)('attendance/monthly-stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.read']),
    __param(0, (0, common_1.Query)('yearMonth')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "monthlyStats", null);
__decorate([
    (0, common_1.Get)('employee-attendance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.read']),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('yearMonth')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "getEmployeeAttendance", null);
__decorate([
    (0, common_1.Get)('employee-attendance-month'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.read']),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('yearMonth')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "getEmployeeAttendanceByMonth", null);
__decorate([
    (0, common_1.Post)('adjust-attendance/:attendanceRecordId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.manage']),
    __param(0, (0, common_1.Param)('attendanceRecordId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, adjust_attendance_dto_1.AdjustAttendanceDto, Object, String]),
    __metadata("design:returntype", Promise)
], ClockInOutController.prototype, "adjustAttendance", null);
exports.ClockInOutController = ClockInOutController = __decorate([
    (0, common_1.Controller)('clock-in-out'),
    __metadata("design:paramtypes", [clock_in_out_service_1.ClockInOutService])
], ClockInOutController);
//# sourceMappingURL=clock-in-out.controller.js.map