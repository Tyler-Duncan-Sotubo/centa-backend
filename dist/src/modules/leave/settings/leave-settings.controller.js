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
exports.LeaveSettingsController = void 0;
const common_1 = require("@nestjs/common");
const leave_settings_service_1 = require("./leave-settings.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let LeaveSettingsController = class LeaveSettingsController extends base_controller_1.BaseController {
    constructor(settingsService) {
        super();
        this.settingsService = settingsService;
    }
    async getLeaveApprovalSetting(user) {
        return await this.settingsService.getLeaveApprovalSettings(user.companyId);
    }
    async getLeaveEntitlementSettings(user) {
        return await this.settingsService.getLeaveEntitlementSettings(user.companyId);
    }
    async getLeaveEligibilitySettings(user) {
        return await this.settingsService.getLeaveEligibilitySettings(user.companyId);
    }
    async getLeaveNotificationSettings(user) {
        return await this.settingsService.getLeaveNotificationSettings(user.companyId);
    }
    async updateLeaveSetting(user, key, value) {
        return this.settingsService.updateLeaveSetting(user.companyId, key, value);
    }
};
exports.LeaveSettingsController = LeaveSettingsController;
__decorate([
    (0, common_1.Get)('approval'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaveSettingsController.prototype, "getLeaveApprovalSetting", null);
__decorate([
    (0, common_1.Get)('entitlement'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaveSettingsController.prototype, "getLeaveEntitlementSettings", null);
__decorate([
    (0, common_1.Get)('eligibility-options'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaveSettingsController.prototype, "getLeaveEligibilitySettings", null);
__decorate([
    (0, common_1.Get)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaveSettingsController.prototype, "getLeaveNotificationSettings", null);
__decorate([
    (0, common_1.Patch)('update-leave-setting'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('key')),
    __param(2, (0, common_1.Body)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], LeaveSettingsController.prototype, "updateLeaveSetting", null);
exports.LeaveSettingsController = LeaveSettingsController = __decorate([
    (0, common_1.Controller)('leave-settings'),
    __metadata("design:paramtypes", [leave_settings_service_1.LeaveSettingsService])
], LeaveSettingsController);
//# sourceMappingURL=leave-settings.controller.js.map