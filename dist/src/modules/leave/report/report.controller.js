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
const base_controller_1 = require("../../../common/interceptor/base.controller");
const search_leave_report_dto_1 = require("./dto/search-leave-report.dto");
let ReportController = class ReportController extends base_controller_1.BaseController {
    constructor(reportService) {
        super();
        this.reportService = reportService;
    }
    async getLeaveManagement(user) {
        return this.reportService.leaveManagement(user.companyId, 'NG');
    }
    async getLeaveBalances(user) {
        return this.reportService.listEmployeeLeaveBalances(user.companyId);
    }
    async getLeaveRequests(user, ip, status) {
        return this.reportService.listLeaveRequests(user.companyId, status);
    }
    async getPendingLeaveRequests(user) {
        return this.reportService.pendingApprovalRequests(user.companyId);
    }
    getLeaveBalanceReport(user) {
        return this.reportService.generateLeaveBalanceReport(user.companyId);
    }
    getLeaveUtilizationReport(user, dto) {
        return this.reportService.generateLeaveUtilizationReport(user.companyId, dto);
    }
    async generateLeaveBalanceReportToS3(user, leaveTypeName, year) {
        const filters = {
            year: year ? parseInt(year.toString(), 10) : undefined,
            leaveTypeName: leaveTypeName || undefined,
        };
        const url = await this.reportService.generateLeaveBalanceReportToS3(user.companyId, filters);
        return { url };
    }
};
exports.ReportController = ReportController;
__decorate([
    (0, common_1.Get)('leave-management'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.reports']),
    (0, common_1.SetMetadata)('roles', ['admin', 'hr', 'super_admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getLeaveManagement", null);
__decorate([
    (0, common_1.Get)('balances'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.reports']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getLeaveBalances", null);
__decorate([
    (0, common_1.Get)('requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.reports']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Ip)()),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getLeaveRequests", null);
__decorate([
    (0, common_1.Get)('summary/pending'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.reports']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "getPendingLeaveRequests", null);
__decorate([
    (0, common_1.Get)('balance-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.reports']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getLeaveBalanceReport", null);
__decorate([
    (0, common_1.Get)('utilization-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.reports']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, search_leave_report_dto_1.SearchLeaveReportsDto]),
    __metadata("design:returntype", void 0)
], ReportController.prototype, "getLeaveUtilizationReport", null);
__decorate([
    (0, common_1.Get)('gen-leave-balance-report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['reports.attendance.download']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('leaveTypeName')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number]),
    __metadata("design:returntype", Promise)
], ReportController.prototype, "generateLeaveBalanceReportToS3", null);
exports.ReportController = ReportController = __decorate([
    (0, common_1.Controller)('leave-reports'),
    __metadata("design:paramtypes", [report_service_1.LeaveReportService])
], ReportController);
//# sourceMappingURL=report.controller.js.map