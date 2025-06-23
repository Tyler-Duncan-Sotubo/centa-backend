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
exports.BonusesController = void 0;
const common_1 = require("@nestjs/common");
const bonuses_service_1 = require("./bonuses.service");
const create_bonus_dto_1 = require("./dto/create-bonus.dto");
const update_bonus_dto_1 = require("./dto/update-bonus.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let BonusesController = class BonusesController extends base_controller_1.BaseController {
    constructor(bonusesService) {
        super();
        this.bonusesService = bonusesService;
    }
    create(createBonusDto, user) {
        return this.bonusesService.create(user, createBonusDto);
    }
    findAll(user) {
        return this.bonusesService.findAll(user.companyId);
    }
    findOne(bonusId) {
        return this.bonusesService.findOne(bonusId);
    }
    findEmployeeBonuses(employeeId, user) {
        return this.bonusesService.findAllEmployeeBonuses(user.companyId, employeeId);
    }
    update(bonusId, updateBonusDto, user) {
        return this.bonusesService.update(bonusId, updateBonusDto, user);
    }
    remove(bonusId, user) {
        return this.bonusesService.remove(user, bonusId);
    }
};
exports.BonusesController = BonusesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.bonuses.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_bonus_dto_1.CreateBonusDto, Object]),
    __metadata("design:returntype", void 0)
], BonusesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.bonuses.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BonusesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':bonusId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.bonuses.read']),
    __param(0, (0, common_1.Param)('bonusId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BonusesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('employee-bonuses/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.bonuses.read']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BonusesController.prototype, "findEmployeeBonuses", null);
__decorate([
    (0, common_1.Patch)(':bonusId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.bonuses.manage']),
    __param(0, (0, common_1.Param)('bonusId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_bonus_dto_1.UpdateBonusDto, Object]),
    __metadata("design:returntype", void 0)
], BonusesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':bonusId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.bonuses.manage']),
    __param(0, (0, common_1.Param)('bonusId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BonusesController.prototype, "remove", null);
exports.BonusesController = BonusesController = __decorate([
    (0, common_1.Controller)('bonuses'),
    __metadata("design:paramtypes", [bonuses_service_1.BonusesService])
], BonusesController);
//# sourceMappingURL=bonuses.controller.js.map