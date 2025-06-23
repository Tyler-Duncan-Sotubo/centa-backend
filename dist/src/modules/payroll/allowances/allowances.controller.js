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
exports.AllowancesController = void 0;
const common_1 = require("@nestjs/common");
const allowances_service_1 = require("./allowances.service");
const create_allowance_dto_1 = require("./dto/create-allowance.dto");
const update_allowance_dto_1 = require("./dto/update-allowance.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
let AllowancesController = class AllowancesController {
    constructor(allowancesService) {
        this.allowancesService = allowancesService;
    }
    create(createAllowanceDto, user) {
        return this.allowancesService.create(createAllowanceDto, user);
    }
    findAll() {
        return this.allowancesService.findAll();
    }
    findOne(id) {
        return this.allowancesService.findOne(id);
    }
    update(id, updateAllowanceDto, user) {
        return this.allowancesService.update(id, updateAllowanceDto, user);
    }
    remove(id, user) {
        return this.allowancesService.remove(id, user);
    }
};
exports.AllowancesController = AllowancesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.allowances.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_allowance_dto_1.CreateAllowanceDto, Object]),
    __metadata("design:returntype", void 0)
], AllowancesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.allowances.read']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AllowancesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.allowances.read']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AllowancesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.allowances.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_allowance_dto_1.UpdateAllowanceDto, Object]),
    __metadata("design:returntype", void 0)
], AllowancesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.allowances.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AllowancesController.prototype, "remove", null);
exports.AllowancesController = AllowancesController = __decorate([
    (0, common_1.Controller)('payroll-allowances'),
    __metadata("design:paramtypes", [allowances_service_1.AllowancesService])
], AllowancesController);
//# sourceMappingURL=allowances.controller.js.map