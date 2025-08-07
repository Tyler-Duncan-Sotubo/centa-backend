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
exports.OffboardingConfigController = void 0;
const common_1 = require("@nestjs/common");
const offboarding_config_service_1 = require("./offboarding-config.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const offboarding_seeder_service_1 = require("./offboarding-seeder.service");
const create_offboarding_config_dto_1 = require("./dto/create-offboarding-config.dto");
const update_offboarding_config_dto_1 = require("./dto/update-offboarding-config.dto");
const offboarding_checklist_dto_1 = require("./dto/offboarding-checklist.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let OffboardingConfigController = class OffboardingConfigController extends base_controller_1.BaseController {
    constructor(configService, seederService) {
        super();
        this.configService = configService;
        this.seederService = seederService;
    }
    async seedDefaults() {
        return this.seederService.seedGlobalOffboardingData();
    }
    async getAll(user) {
        return this.configService.getAllTerminationConfig(user.companyId);
    }
    async createType(user, dto) {
        return this.configService.createType(user, dto);
    }
    async updateType(id, user, dto) {
        return this.configService.updateType(id, dto, user);
    }
    async deleteType(id, user) {
        return this.configService.deleteType(id, user);
    }
    async createReason(user, dto) {
        return this.configService.createReason(user, dto);
    }
    async updateReason(id, user, dto) {
        return this.configService.updateReason(id, dto, user);
    }
    async deleteReason(id, user) {
        return this.configService.deleteReason(id, user);
    }
    async createChecklistItem(user, dto) {
        return this.configService.createChecklistItem(user, dto);
    }
    async updateChecklistItem(id, user, dto) {
        return this.configService.updateChecklistItem(id, dto, user);
    }
    async deleteChecklistItem(id, user) {
        return this.configService.deleteChecklistItem(id, user);
    }
};
exports.OffboardingConfigController = OffboardingConfigController;
__decorate([
    (0, common_1.Post)('seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "seedDefaults", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)('type'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_offboarding_config_dto_1.CreateOffboardingConfigDto]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "createType", null);
__decorate([
    (0, common_1.Patch)('type/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_offboarding_config_dto_1.UpdateOffboardingConfigDto]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "updateType", null);
__decorate([
    (0, common_1.Delete)('type/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "deleteType", null);
__decorate([
    (0, common_1.Post)('reason'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_offboarding_config_dto_1.CreateOffboardingConfigDto]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "createReason", null);
__decorate([
    (0, common_1.Patch)('reason/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_offboarding_config_dto_1.UpdateOffboardingConfigDto]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "updateReason", null);
__decorate([
    (0, common_1.Delete)('reason/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "deleteReason", null);
__decorate([
    (0, common_1.Post)('checklist'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, offboarding_checklist_dto_1.OffboardingChecklistItemDto]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "createChecklistItem", null);
__decorate([
    (0, common_1.Patch)('checklist/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, offboarding_checklist_dto_1.OffboardingChecklistItemDto]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "updateChecklistItem", null);
__decorate([
    (0, common_1.Delete)('checklist/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OffboardingConfigController.prototype, "deleteChecklistItem", null);
exports.OffboardingConfigController = OffboardingConfigController = __decorate([
    (0, common_1.Controller)('offboarding-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    __metadata("design:paramtypes", [offboarding_config_service_1.OffboardingConfigService,
        offboarding_seeder_service_1.OffboardingSeederService])
], OffboardingConfigController);
//# sourceMappingURL=offboarding-config.controller.js.map