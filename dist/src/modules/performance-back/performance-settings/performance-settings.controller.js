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
exports.PerformanceSettingsController = void 0;
const common_1 = require("@nestjs/common");
const performance_settings_service_1 = require("./performance-settings.service");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let PerformanceSettingsController = class PerformanceSettingsController extends base_controller_1.BaseController {
    constructor(performanceSettingsService) {
        super();
        this.performanceSettingsService = performanceSettingsService;
    }
    async getPerformanceSettings(user) {
        return this.performanceSettingsService.getPerformanceSettings(user.companyId);
    }
    async updatePerformanceSettings(user, key, value) {
        return this.performanceSettingsService.updatePerformanceSetting(user.companyId, key, value);
    }
};
exports.PerformanceSettingsController = PerformanceSettingsController;
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['performance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PerformanceSettingsController.prototype, "getPerformanceSettings", null);
__decorate([
    (0, common_1.Patch)('update'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['performance.settings']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('key')),
    __param(2, (0, common_1.Body)('value')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PerformanceSettingsController.prototype, "updatePerformanceSettings", null);
exports.PerformanceSettingsController = PerformanceSettingsController = __decorate([
    (0, common_1.Controller)('performance-settings'),
    __metadata("design:paramtypes", [performance_settings_service_1.PerformanceSettingsService])
], PerformanceSettingsController);
//# sourceMappingURL=performance-settings.controller.js.map