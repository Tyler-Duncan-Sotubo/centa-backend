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
exports.RunController = void 0;
const common_1 = require("@nestjs/common");
const run_service_1 = require("./run.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let RunController = class RunController extends base_controller_1.BaseController {
    constructor(runService) {
        super();
        this.runService = runService;
        this.formattedDate = () => {
            const date = new Date();
            const month = String(date.getMonth()).padStart(2, '0');
            const year = date.getFullYear();
            const formattedDate = `${year}-${month}`;
            return formattedDate;
        };
    }
    async calculatePayrollForCompany(user, date) {
        const payrollDate = date || new Date().toISOString();
        return this.runService.calculatePayrollForCompany(user, payrollDate, '');
    }
    async getOnePayRun(payRunId) {
        return this.runService.findOnePayRun(payRunId);
    }
    async getPayrollSummary(payRunId) {
        return this.runService.getPayrollSummaryByRunId(payRunId);
    }
    async sendForApproval(payRunId, user) {
        return this.runService.sendForApproval(payRunId, user.id);
    }
    async updatePayRun(payRunId, user, remarks) {
        return this.runService.approvePayrollRun(payRunId, user, remarks);
    }
    async updatePaymentStatus(payRunId, user) {
        return this.runService.markAsInProgress(payRunId, user);
    }
    async getApprovalStatus(payRunId) {
        return this.runService.checkApprovalStatus(payRunId);
    }
    async updatePayrollPaymentStatus(user, id, status) {
        return this.runService.updatePayrollPaymentStatus(user, id, status);
    }
    discardRun(user, runId) {
        return this.runService.discardPayrollRun(user, runId);
    }
};
exports.RunController = RunController;
__decorate([
    (0, common_1.Post)('calculate-payroll-for-company/:date?'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.calculate']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "calculatePayrollForCompany", null);
__decorate([
    (0, common_1.Get)(':payRunId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.read']),
    __param(0, (0, common_1.Param)('payRunId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "getOnePayRun", null);
__decorate([
    (0, common_1.Get)(':payRunId/summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.read']),
    __param(0, (0, common_1.Param)('payRunId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "getPayrollSummary", null);
__decorate([
    (0, common_1.Patch)(':payRunId/send-for-approval'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.send_for_approval']),
    __param(0, (0, common_1.Param)('payRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "sendForApproval", null);
__decorate([
    (0, common_1.Patch)(':payRunId/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.approve']),
    __param(0, (0, common_1.Param)('payRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)('remarks')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "updatePayRun", null);
__decorate([
    (0, common_1.Patch)(':payRunId/payment-in-progress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.mark_in_progress']),
    __param(0, (0, common_1.Param)('payRunId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "updatePaymentStatus", null);
__decorate([
    (0, common_1.Get)('approval-status/:payRunId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.approval_status']),
    __param(0, (0, common_1.Param)('payRunId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "getApprovalStatus", null);
__decorate([
    (0, common_1.Patch)('approve-payroll/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.update_payment_status']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], RunController.prototype, "updatePayrollPaymentStatus", null);
__decorate([
    (0, common_1.Delete)(':runId/discard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.run.update_payment_status']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('runId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RunController.prototype, "discardRun", null);
exports.RunController = RunController = __decorate([
    (0, common_1.Controller)('payroll'),
    __metadata("design:paramtypes", [run_service_1.RunService])
], RunController);
//# sourceMappingURL=run.controller.js.map