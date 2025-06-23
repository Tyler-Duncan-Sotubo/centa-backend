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
exports.BenefitGroupsController = void 0;
const common_1 = require("@nestjs/common");
const benefit_groups_service_1 = require("./benefit-groups.service");
const create_benefit_group_dto_1 = require("./dto/create-benefit-group.dto");
const update_benefit_group_dto_1 = require("./dto/update-benefit-group.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let BenefitGroupsController = class BenefitGroupsController extends base_controller_1.BaseController {
    constructor(benefitGroupsService) {
        super();
        this.benefitGroupsService = benefitGroupsService;
    }
    create(dto, user) {
        return this.benefitGroupsService.create(dto, user);
    }
    findAll(user) {
        return this.benefitGroupsService.findAll(user.companyId);
    }
    findOne(id) {
        return this.benefitGroupsService.findOne(id);
    }
    update(id, dto, user) {
        return this.benefitGroupsService.update(id, dto, user);
    }
    remove(id, user) {
        return this.benefitGroupsService.remove(id, user);
    }
};
exports.BenefitGroupsController = BenefitGroupsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_groups.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_benefit_group_dto_1.CreateBenefitGroupDto, Object]),
    __metadata("design:returntype", void 0)
], BenefitGroupsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_groups.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BenefitGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_groups.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BenefitGroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_groups.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_benefit_group_dto_1.UpdateBenefitGroupDto, Object]),
    __metadata("design:returntype", void 0)
], BenefitGroupsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['benefit_groups.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BenefitGroupsController.prototype, "remove", null);
exports.BenefitGroupsController = BenefitGroupsController = __decorate([
    (0, common_1.Controller)('benefit-groups'),
    __metadata("design:paramtypes", [benefit_groups_service_1.BenefitGroupsService])
], BenefitGroupsController);
//# sourceMappingURL=benefit-groups.controller.js.map