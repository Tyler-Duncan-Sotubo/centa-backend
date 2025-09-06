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
exports.ReportController = void 0;
const common_1 = require("@nestjs/common");
const report_service_1 = require("./report.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const generate_reports_service_1 = require("./generate-reports.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let ReportController = class ReportController extends base_controller_1.BaseController {
    constructor(reportService, generateReportsService) {
        super();
        this.reportService = reportService;
        this.generateReportsService = generateReportsService;
    }
    async getCombinedAttendanceReport(user, startDate, endDate, yearMonth) {
        return this.reportService.getCombinedAttendanceReports(user.companyId, yearMonth, startDate, endDate);
    }
    async getAttendanceSummary(user) {
        return this.reportService.getDailyAttendanceSummary(user.companyId);
    }
    async getMonthlyAttendanceSummary(user, yearMonth) {
        return this.reportService.getMonthlyAttendanceSummary(user.companyId, yearMonth);
    }
    async getShiftDashboardSummaryByMonth(user, yearMonth, locationId, departmentId) {
        return this.reportService.getShiftDashboardSummaryByMonth(user.companyId, yearMonth, { locationId, departmentId });
    }
    async getLateArrivalsReport(user, yearMonth) {
        return this.reportService.getLateArrivalsReport(user.companyId, yearMonth);
    }
    async getAbsenteeismReport(user, startDate, endDate) {
        return this.reportService.getAbsenteeismReport(user.companyId, startDate, endDate);
    }
    async getOvertimeReport(user, yearMonth) {
        return this.reportService.getOvertimeReport(user.companyId, yearMonth);
    }
    async getDepartmentReport(user, yearMonth) {
        return this.reportService.getDepartmentAttendanceSummary(user.companyId, yearMonth);
    }
    async downloadDailyAttendanceSummary(user) {
        const url = await this.generateReportsService.generateDailyAttendanceSummaryToS3(user.companyId);
        return { url };
    }
    async downloadMonthlyAttendanceSummary(user, yearMonth) {
        const url = await this.generateReportsService.generateMonthlyAttendanceSummaryToS3(user.companyId, yearMonth);
        return { url };
    }
    async downloadLateArrivalsReport(user, yearMonth) {
        const url = await this.generateReportsService.generateLateArrivalsReportToS3(user.companyId, yearMonth);
        return { url };
    }
    async generateDepartmentReport(user, yearMonth) {
        const url = await this.generateReportsService.generateDepartmentAttendanceReport(user.companyId, yearMonth);
        return { url };
    }
    async downloadAbsenteeismReport(user, startDate, endDate) {
        const url = await this.generateReportsService.generateAbsenteeismReportToS3(user.companyId, startDate, endDate);
        return { url };
    }
    async downloadOvertimeReport(user, yearMonth) {
        const url = await this.generateReportsService.generateOvertimeReportToS3(user.companyId, yearMonth);
        return { url };
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('attendance/combined'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getCombinedAttendanceReport", null);
__decorate([
    (0, common_1.Get)('attendance-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getAttendanceSummary", null);
__decorate([
    (0, common_1.Get)('monthly-attendance-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getMonthlyAttendanceSummary", null);
__decorate([
    (0, common_1.Get)('shift-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __param(2, (0, common_1.Query)('locationId')),
    __param(3, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getShiftDashboardSummaryByMonth", null);
__decorate([
    (0, common_1.Get)('late-arrivals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getLateArrivalsReport", null);
__decorate([
    (0, common_1.Get)('absenteeism'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getAbsenteeismReport", null);
__decorate([
    (0, common_1.Get)('overtime'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getOvertimeReport", null);
__decorate([
    (0, common_1.Get)('department-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getDepartmentReport", null);
__decorate([
    (0, common_1.Get)('gen-daily-attendance-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadDailyAttendanceSummary", null);
__decorate([
    (0, common_1.Get)('gen-monthly-attendance-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadMonthlyAttendanceSummary", null);
__decorate([
    (0, common_1.Get)('gen-late-arrivals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadLateArrivalsReport", null);
__decorate([
    (0, common_1.Get)('gen-department-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "generateDepartmentReport", null);
__decorate([
    (0, common_1.Get)('gen-absenteeism'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadAbsenteeismReport", null);
__decorate([
    (0, common_1.Get)('gen-overtime'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['attendance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('yearMonth')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "downloadOvertimeReport", null);
exports.ReportController = ReportController = __decorate([
    (0, common_1.Controller)('attendance-report'),
    __metadata("design:paramtypes", [report_service_1.ReportService,
        generate_reports_service_1.GenerateReportsService])
], ReportController);
//# sourceMappingURL=report.controller.js.map