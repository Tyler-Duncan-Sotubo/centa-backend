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
exports.LeaveBalanceController = void 0;
const common_1 = require("@nestjs/common");
const leave_balance_service_1 = require("./leave-balance.service");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const leave_accrual_cron_1 = require("./leave-accrual.cron");
let LeaveBalanceController = class LeaveBalanceController extends base_controller_1.BaseController {
    constructor(leaveBalanceService, leaveAccrualCronService) {
        super();
        this.leaveBalanceService = leaveBalanceService;
        this.leaveAccrualCronService = leaveAccrualCronService;
    }
    async handleMonthlyLeaveAccruals() {
        await this.leaveAccrualCronService.handleMonthlyLeaveAccruals();
        return { message: 'Leave accruals processed successfully' };
    }
    findAll(user) {
        return this.leaveBalanceService.findAll(user.companyId);
    }
    findEmployeeLeaveBalance(user, employeeId) {
        return this.leaveBalanceService.findByEmployeeId(employeeId);
    }
};
exports.LeaveBalanceController = LeaveBalanceController;
__decorate([
    (0, common_1.Get)('accrual'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.balance.accrual']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveBalanceController.prototype, "handleMonthlyLeaveAccruals", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.balance.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeaveBalanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('employee/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.balance.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeaveBalanceController.prototype, "findEmployeeLeaveBalance", null);
exports.LeaveBalanceController = LeaveBalanceController = __decorate([
    (0, common_1.Controller)('leave-balance'),
    __metadata("design:paramtypes", [leave_balance_service_1.LeaveBalanceService,
        leave_accrual_cron_1.LeaveAccrualCronService])
], LeaveBalanceController);
//# sourceMappingURL=leave-balance.controller.js.map