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
exports.LoanController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../config/base.controller");
const loan_service_1 = require("./services/loan.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const create_loan_dto_1 = require("./dto/create-loan.dto");
const audit_interceptor_1 = require("../audit/audit.interceptor");
const audit_decorator_1 = require("../audit/audit.decorator");
let LoanController = class LoanController extends base_controller_1.BaseController {
    constructor(loanService) {
        super();
        this.loanService = loanService;
    }
    async requestLoan(employee_id, dto) {
        return this.loanService.salaryAdvanceRequest(dto, employee_id);
    }
    async getLoans(user) {
        return this.loanService.getAdvances(user.company_id);
    }
    async getLoansByEmployee(employee_id) {
        return this.loanService.getAdvancesAndRepaymentsByEmployee(employee_id);
    }
    async getLoanById(loan_id) {
        return this.loanService.getAdvanceById(loan_id);
    }
    async updateLoanStatus(loan_id, dto, user) {
        return this.loanService.updateAdvanceStatus(loan_id, dto, user.id);
    }
    async deleteLoan(loan_id) {
        return this.loanService.deleteAdvance(loan_id);
    }
    async repayLoan(loan_id, amount) {
        return this.loanService.repayAdvance(loan_id, amount);
    }
    async getRepaymentsByEmployee(employee_id) {
        return this.loanService.getAdvancesAndRepaymentsByEmployee(employee_id);
    }
    async getRepaymentsByLoan(loan_id) {
        return this.loanService.getRepaymentByLoan(loan_id);
    }
    async getLoanHistoryByCompany(user) {
        return this.loanService.getAdvancesHistoryByCompany(user.company_id);
    }
    async getLoanHistoryByEmployee(employee_id) {
        return this.loanService.getAdvanceHistoryByEmployee(employee_id);
    }
};
exports.LoanController = LoanController;
__decorate([
    (0, common_1.Post)('loans/request/:employee_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin', 'employee']),
    (0, audit_decorator_1.Audit)({ action: 'Loan Request', entity: 'Loan' }),
    __param(0, (0, common_1.Param)('employee_id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_loan_dto_1.LoanRequestDto]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "requestLoan", null);
__decorate([
    (0, common_1.Get)('loans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getLoans", null);
__decorate([
    (0, common_1.Get)('/loans/employee/:employee_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('employee_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getLoansByEmployee", null);
__decorate([
    (0, common_1.Get)('loans/:loan_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('loan_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getLoanById", null);
__decorate([
    (0, common_1.Patch)('/loans/update-status/:loan_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Updated Loan', entity: 'Loan' }),
    __param(0, (0, common_1.Param)('loan_id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_loan_dto_1.UpdateLoanStatusDto, Object]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "updateLoanStatus", null);
__decorate([
    (0, common_1.Delete)(':loan_id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'admin']),
    (0, audit_decorator_1.Audit)({ action: 'Deleted Loan', entity: 'Loan' }),
    __param(0, (0, common_1.Param)('loan_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "deleteLoan", null);
__decorate([
    (0, common_1.Post)('repay/:loan_id'),
    (0, audit_decorator_1.Audit)({ action: 'Created Repayment', entity: 'Loan' }),
    __param(0, (0, common_1.Param)('loan_id')),
    __param(1, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "repayLoan", null);
__decorate([
    (0, common_1.Get)('repayments/:employee_id'),
    __param(0, (0, common_1.Param)('employee_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getRepaymentsByEmployee", null);
__decorate([
    (0, common_1.Get)('repayments/:loan_id'),
    __param(0, (0, common_1.Param)('loan_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getRepaymentsByLoan", null);
__decorate([
    (0, common_1.Get)('loans-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getLoanHistoryByCompany", null);
__decorate([
    (0, common_1.Get)('history/:employee_id'),
    __param(0, (0, common_1.Param)('employee_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LoanController.prototype, "getLoanHistoryByEmployee", null);
exports.LoanController = LoanController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)(''),
    __metadata("design:paramtypes", [loan_service_1.LoanService])
], LoanController);
//# sourceMappingURL=loan.controller.js.map