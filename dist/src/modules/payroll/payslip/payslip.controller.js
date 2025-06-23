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
exports.PayslipController = void 0;
const common_1 = require("@nestjs/common");
const payslip_service_1 = require("./payslip.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let PayslipController = class PayslipController extends base_controller_1.BaseController {
    constructor(payslipService) {
        super();
        this.payslipService = payslipService;
    }
    async getCompanyPayslips(user, id) {
        return this.payslipService.getCompanyPayslipsById(user.companyId, id);
    }
    async getEmployeePayslipSummary(employeeId) {
        return this.payslipService.getEmployeePayslipSummary(employeeId);
    }
    async getEmployeePayslips(employeeId, user) {
        return this.payslipService.getEmployeePayslipSummary(user.id);
    }
    async getEmployeePayslip(payslipId) {
        return this.payslipService.getEmployeePayslip(payslipId);
    }
};
exports.PayslipController = PayslipController;
__decorate([
    (0, common_1.Get)('payslips/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.payslips.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayslipController.prototype, "getCompanyPayslips", null);
__decorate([
    (0, common_1.Get)('employee-payslip-summary/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.payslips.read_all']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayslipController.prototype, "getEmployeePayslipSummary", null);
__decorate([
    (0, common_1.Get)('employee-payslip'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.payslips.read_self']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PayslipController.prototype, "getEmployeePayslips", null);
__decorate([
    (0, common_1.Get)('employee-payslip/:payslipId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.payslips.read_self']),
    __param(0, (0, common_1.Param)('payslipId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayslipController.prototype, "getEmployeePayslip", null);
exports.PayslipController = PayslipController = __decorate([
    (0, common_1.Controller)('payslip'),
    __metadata("design:paramtypes", [payslip_service_1.PayslipService])
], PayslipController);
//# sourceMappingURL=payslip.controller.js.map