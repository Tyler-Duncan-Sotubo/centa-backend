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
exports.SalaryAdvanceController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const salary_advance_service_1 = require("./salary-advance.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const create_salary_advance_dto_1 = require("./dto/create-salary-advance.dto");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
let SalaryAdvanceController = class SalaryAdvanceController extends base_controller_1.BaseController {
    constructor(salaryAdvanceService) {
        super();
        this.salaryAdvanceService = salaryAdvanceService;
    }
    async requestLoan(employeeId, dto, user) {
        return this.salaryAdvanceService.salaryAdvanceRequest(dto, employeeId, user);
    }
    async getLoans(user) {
        return this.salaryAdvanceService.getAdvances(user.companyId);
    }
    async getLoansByEmployee(employeeId) {
        return this.salaryAdvanceService.getAdvancesAndRepaymentsByEmployee(employeeId);
    }
    async getLoanById(id) {
        return this.salaryAdvanceService.getAdvanceById(id);
    }
    async updateLoanStatus(id, dto, user) {
        return this.salaryAdvanceService.updateAdvanceStatus(id, dto, user.id);
    }
    async repayLoan(loan_id, amount) {
        return this.salaryAdvanceService.repayAdvance(loan_id, amount);
    }
    async getRepaymentsByEmployee(employeeId) {
        return this.salaryAdvanceService.getAdvancesAndRepaymentsByEmployee(employeeId);
    }
    async getLoanHistoryByCompany(user) {
        return this.salaryAdvanceService.getAdvancesHistoryByCompany(user.companyId);
    }
    async getLoanHistoryByEmployee(employeeId) {
        return this.salaryAdvanceService.getAdvanceHistoryByEmployee(employeeId);
    }
};
exports.SalaryAdvanceController = SalaryAdvanceController;
__decorate([
    (0, common_1.Post)('request/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.request']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_salary_advance_dto_1.CreateSalaryAdvanceDto, Object]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "requestLoan", null);
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "getLoans", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.read_employee']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "getLoansByEmployee", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.read_one']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "getLoanById", null);
__decorate([
    (0, common_1.Patch)('update-status/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_salary_advance_dto_1.UpdateLoanStatusDto, Object]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "updateLoanStatus", null);
__decorate([
    (0, common_1.Post)('repay/:loan_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.repay']),
    __param(0, (0, common_1.Param)('loan_id')),
    __param(1, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "repayLoan", null);
__decorate([
    (0, common_1.Get)('repayments/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.read_employee']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "getRepaymentsByEmployee", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.history']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "getLoanHistoryByCompany", null);
__decorate([
    (0, common_1.Get)('history/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['salary_advance.history_employee']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalaryAdvanceController.prototype, "getLoanHistoryByEmployee", null);
exports.SalaryAdvanceController = SalaryAdvanceController = __decorate([
    (0, common_1.Controller)('salary-advance'),
    __metadata("design:paramtypes", [salary_advance_service_1.SalaryAdvanceService])
], SalaryAdvanceController);
//# sourceMappingURL=salary-advance.controller.js.map