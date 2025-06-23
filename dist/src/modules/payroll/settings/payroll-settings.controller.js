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
exports.PayrollSettingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const payroll_settings_service_1 = require("./payroll-settings.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let PayrollSettingsController = class PayrollSettingsController extends base_controller_1.BaseController {
    constructor(payrollSettingsService) {
        super();
        this.payrollSettingsService = payrollSettingsService;
    }
    async getStatutoryDeductions(user) {
        return this.payrollSettingsService.payrollSettings(user.companyId);
    }
    async getAllowanceSettings(user) {
        return this.payrollSettingsService.allowanceSettings(user.companyId);
    }
    async getApprovalAndProration(user) {
        return this.payrollSettingsService.getApprovalAndProrationSettings(user.companyId);
    }
    async getLoanSettings(user) {
        return this.payrollSettingsService.getLoanSettings(user.companyId);
    }
    async getThirteenthMonthSettings(user) {
        return this.payrollSettingsService.getThirteenthMonthSettings(user.companyId);
    }
    async updatePayrollSetting(user, key, value) {
        return this.payrollSettingsService.updatePayrollSetting(user.companyId, key, value);
    }
};
exports.PayrollSettingsController = PayrollSettingsController;
__decorate([
    (0, common_1.Get)('statutory-deductions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll_settings.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "getStatutoryDeductions", null);
__decorate([
    (0, common_1.Get)('allowance-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll_settings.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "getAllowanceSettings", null);
__decorate([
    (0, common_1.Get)('approval-proration'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll_settings.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "getApprovalAndProration", null);
__decorate([
    (0, common_1.Get)('loan-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll_settings.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "getLoanSettings", null);
__decorate([
    (0, common_1.Get)('13th-month'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll_settings.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "getThirteenthMonthSettings", null);
__decorate([
    (0, common_1.Patch)('update-payroll-setting'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll_settings.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('key')),
    __param(2, (0, common_1.Body)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PayrollSettingsController.prototype, "updatePayrollSetting", null);
exports.PayrollSettingsController = PayrollSettingsController = __decorate([
    (0, common_1.Controller)('payroll-settings'),
    __metadata("design:paramtypes", [payroll_settings_service_1.PayrollSettingsService])
], PayrollSettingsController);
//# sourceMappingURL=payroll-settings.controller.js.map