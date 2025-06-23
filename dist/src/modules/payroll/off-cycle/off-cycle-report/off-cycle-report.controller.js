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
exports.OffCycleReportController = void 0;
const common_1 = require("@nestjs/common");
const off_cycle_report_service_1 = require("./off-cycle-report.service");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let OffCycleReportController = class OffCycleReportController extends base_controller_1.BaseController {
    constructor(offCycleReportService) {
        super();
        this.offCycleReportService = offCycleReportService;
    }
    async getOffCycleSummary(user, fromDate, toDate) {
        return this.offCycleReportService.getOffCycleSummary(user.companyId, fromDate, toDate);
    }
    async getOffCycleVsRegular(user, month) {
        return this.offCycleReportService.getOffCycleVsRegular(user.companyId, month);
    }
    async getOffCycleByEmployee(user, employeeId) {
        return this.offCycleReportService.getOffCycleByEmployee(user.companyId, employeeId);
    }
    async getOffCycleTypeBreakdown(user, month) {
        return this.offCycleReportService.getOffCycleTypeBreakdown(user.companyId, month);
    }
    async getOffCycleTaxImpact(user, month) {
        return this.offCycleReportService.getOffCycleTaxImpact(user.companyId, month);
    }
    async getOffCycleDashboard(user, month, fromDate, toDate, employeeId) {
        return this.offCycleReportService.getOffCycleDashboard(user.companyId, {
            month,
            fromDate,
            toDate,
            employeeId,
        });
    }
};
exports.OffCycleReportController = OffCycleReportController;
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('fromDate')),
    __param(2, (0, common_1.Query)('toDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], OffCycleReportController.prototype, "getOffCycleSummary", null);
__decorate([
    (0, common_1.Get)('vs-regular'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OffCycleReportController.prototype, "getOffCycleVsRegular", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OffCycleReportController.prototype, "getOffCycleByEmployee", null);
__decorate([
    (0, common_1.Get)('type-breakdown'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OffCycleReportController.prototype, "getOffCycleTypeBreakdown", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId/type-breakdown'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OffCycleReportController.prototype, "getOffCycleTaxImpact", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('fromDate')),
    __param(3, (0, common_1.Query)('toDate')),
    __param(4, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], OffCycleReportController.prototype, "getOffCycleDashboard", null);
exports.OffCycleReportController = OffCycleReportController = __decorate([
    (0, common_1.Controller)('off-cycle-report'),
    __metadata("design:paramtypes", [off_cycle_report_service_1.OffCycleReportService])
], OffCycleReportController);
//# sourceMappingURL=off-cycle-report.controller.js.map