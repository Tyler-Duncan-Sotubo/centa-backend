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
exports.PayrollOverridesController = void 0;
const common_1 = require("@nestjs/common");
const payroll_overrides_service_1 = require("./payroll-overrides.service");
const create_payroll_override_dto_1 = require("./dto/create-payroll-override.dto");
const update_payroll_override_dto_1 = require("./dto/update-payroll-override.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let PayrollOverridesController = class PayrollOverridesController {
    constructor(payrollOverridesService) {
        this.payrollOverridesService = payrollOverridesService;
    }
    create(user, createPayrollOverrideDto) {
        return this.payrollOverridesService.create(createPayrollOverrideDto, user);
    }
    findAll(user) {
        return this.payrollOverridesService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.payrollOverridesService.findOne(id, user.companyId);
    }
    update(id, updatePayrollOverrideDto, user) {
        return this.payrollOverridesService.update(id, updatePayrollOverrideDto, user);
    }
};
exports.PayrollOverridesController = PayrollOverridesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_payroll_override_dto_1.CreatePayrollOverrideDto]),
    __metadata("design:returntype", void 0)
], PayrollOverridesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayrollOverridesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PayrollOverridesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payroll_override_dto_1.UpdatePayrollOverrideDto, Object]),
    __metadata("design:returntype", void 0)
], PayrollOverridesController.prototype, "update", null);
exports.PayrollOverridesController = PayrollOverridesController = __decorate([
    (0, common_1.Controller)('payroll-overrides'),
    __metadata("design:paramtypes", [payroll_overrides_service_1.PayrollOverridesService])
], PayrollOverridesController);
//# sourceMappingURL=payroll-overrides.controller.js.map