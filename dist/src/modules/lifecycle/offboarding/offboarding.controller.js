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
exports.OffboardingController = void 0;
const common_1 = require("@nestjs/common");
const offboarding_service_1 = require("./offboarding.service");
const create_offboarding_dto_1 = require("./dto/create-offboarding.dto");
const update_offboarding_dto_1 = require("./dto/update-offboarding.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let OffboardingController = class OffboardingController extends base_controller_1.BaseController {
    constructor(offboardingService) {
        super();
        this.offboardingService = offboardingService;
    }
    create(createOffboardingDto, user) {
        return this.offboardingService.create(createOffboardingDto, user);
    }
    findAll(user) {
        return this.offboardingService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.offboardingService.findOne(id, user.companyId);
    }
    update(id, updateOffboardingDto, user) {
        return this.offboardingService.update(id, updateOffboardingDto, user);
    }
    updateChecklist(checklistItemId, user) {
        return this.offboardingService.updateChecklist(checklistItemId, user);
    }
    remove(id, user) {
        return this.offboardingService.remove(id, user);
    }
};
exports.OffboardingController = OffboardingController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_offboarding_dto_1.CreateOffboardingDto, Object]),
    __metadata("design:returntype", void 0)
], OffboardingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OffboardingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OffboardingController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_offboarding_dto_1.UpdateOffboardingDto, Object]),
    __metadata("design:returntype", void 0)
], OffboardingController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('update-checklist'),
    __param(0, (0, common_1.Body)('checklistItemId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OffboardingController.prototype, "updateChecklist", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], OffboardingController.prototype, "remove", null);
exports.OffboardingController = OffboardingController = __decorate([
    (0, common_1.Controller)('offboarding'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    __metadata("design:paramtypes", [offboarding_service_1.OffboardingService])
], OffboardingController);
//# sourceMappingURL=offboarding.controller.js.map