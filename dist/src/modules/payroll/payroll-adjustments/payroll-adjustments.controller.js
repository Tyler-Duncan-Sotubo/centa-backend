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
exports.PayrollAdjustmentsController = void 0;
const common_1 = require("@nestjs/common");
const payroll_adjustments_service_1 = require("./payroll-adjustments.service");
const create_payroll_adjustment_dto_1 = require("./dto/create-payroll-adjustment.dto");
const update_payroll_adjustment_dto_1 = require("./dto/update-payroll-adjustment.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let PayrollAdjustmentsController = class PayrollAdjustmentsController {
    constructor(payrollAdjustmentsService) {
        this.payrollAdjustmentsService = payrollAdjustmentsService;
    }
    create(createPayrollAdjustmentDto, user) {
        return this.payrollAdjustmentsService.create(createPayrollAdjustmentDto, user);
    }
    findAll(user) {
        return this.payrollAdjustmentsService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.payrollAdjustmentsService.findOne(id, user.companyId);
    }
    update(id, updatePayrollAdjustmentDto, user) {
        return this.payrollAdjustmentsService.update(id, updatePayrollAdjustmentDto, user);
    }
    remove(id, user) {
        return this.payrollAdjustmentsService.remove(id, user);
    }
};
exports.PayrollAdjustmentsController = PayrollAdjustmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.adjustments.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payroll_adjustment_dto_1.CreatePayrollAdjustmentDto, Object]),
    __metadata("design:returntype", void 0)
], PayrollAdjustmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.adjustments.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayrollAdjustmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.adjustments.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PayrollAdjustmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.adjustments.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_payroll_adjustment_dto_1.UpdatePayrollAdjustmentDto, Object]),
    __metadata("design:returntype", void 0)
], PayrollAdjustmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.adjustments.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PayrollAdjustmentsController.prototype, "remove", null);
exports.PayrollAdjustmentsController = PayrollAdjustmentsController = __decorate([
    (0, common_1.Controller)('payroll-adjustments'),
    __metadata("design:paramtypes", [payroll_adjustments_service_1.PayrollAdjustmentsService])
], PayrollAdjustmentsController);
//# sourceMappingURL=payroll-adjustments.controller.js.map