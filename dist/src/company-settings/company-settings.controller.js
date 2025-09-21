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
exports.CompanySettingsController = void 0;
const common_1 = require("@nestjs/common");
const company_settings_service_1 = require("./company-settings.service");
const common_2 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../modules/auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../modules/auth/decorator/current-user.decorator");
const base_controller_1 = require("../common/interceptor/base.controller");
let CompanySettingsController = class CompanySettingsController extends base_controller_1.BaseController {
    constructor(companySettingsService) {
        super();
        this.companySettingsService = companySettingsService;
    }
    async backfillOnboarding() {
        return this.companySettingsService.backfillOnboardingModulesForAllCompanies();
    }
    async getDefaultManager(user) {
        return this.companySettingsService.getDefaultManager(user.companyId);
    }
    async updateDefaultManager(user, body) {
        return this.companySettingsService.setSetting(user.companyId, body.key, body.value);
    }
    async getTwoFactorAuthSetting(user) {
        return this.companySettingsService.getTwoFactorAuthSetting(user.companyId);
    }
    async updateTwoFactorAuthSetting(user, body) {
        return this.companySettingsService.setSetting(user.companyId, body.key, body.value);
    }
    async getOnboardingStep(user) {
        return this.companySettingsService.getOnboardingVisibility(user.companyId);
    }
    async getOnboardingProgress(user, module) {
        return this.companySettingsService.getOnboardingModule(user.companyId, module);
    }
    async updateOnboardingProgress(user, body) {
        return this.companySettingsService.setOnboardingTask(user.companyId, body.module, body.task, body.status);
    }
};
exports.CompanySettingsController = CompanySettingsController;
__decorate([
    (0, common_1.Post)('backfill-onboarding'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "backfillOnboarding", null);
__decorate([
    (0, common_2.Get)('default-manager'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getDefaultManager", null);
__decorate([
    (0, common_1.Patch)('default-manager'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "updateDefaultManager", null);
__decorate([
    (0, common_2.Get)('two-factor-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getTwoFactorAuthSetting", null);
__decorate([
    (0, common_1.Patch)('two-factor-auth'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "updateTwoFactorAuthSetting", null);
__decorate([
    (0, common_2.Get)('onboarding'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getOnboardingStep", null);
__decorate([
    (0, common_2.Get)('onboarding-progress/:module'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('module')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getOnboardingProgress", null);
__decorate([
    (0, common_1.Post)('onboarding-progress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "updateOnboardingProgress", null);
exports.CompanySettingsController = CompanySettingsController = __decorate([
    (0, common_1.Controller)('company-settings'),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], CompanySettingsController);
//# sourceMappingURL=company-settings.controller.js.map