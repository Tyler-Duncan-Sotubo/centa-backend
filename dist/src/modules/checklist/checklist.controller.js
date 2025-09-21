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
exports.ChecklistController = void 0;
const common_1 = require("@nestjs/common");
const staff_checklist_service_1 = require("./services/staff-checklist.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const checklist_service_1 = require("./checklist.service");
const payroll_checklist_service_1 = require("./services/payroll-checklist.service");
const base_controller_1 = require("../../common/interceptor/base.controller");
const performance_checklist_service_1 = require("./services/performance-checklist.service");
const hiring_checklist_service_1 = require("./services/hiring-checklist.service");
const attendance_checklist_service_1 = require("./services/attendance-checklist.service");
const leave_checklist_service_1 = require("./services/leave-checklist.service");
let ChecklistController = class ChecklistController extends base_controller_1.BaseController {
    constructor(svc, checklist, payroll, performance, hiring, attendance, leave) {
        super();
        this.svc = svc;
        this.checklist = checklist;
        this.payroll = payroll;
        this.performance = performance;
        this.hiring = hiring;
        this.attendance = attendance;
        this.leave = leave;
    }
    async progress(user) {
        return await this.svc.getStaffChecklist(user.companyId);
    }
    async payrollChecklist(user) {
        return await this.payroll.getPayrollChecklist(user.companyId);
    }
    async performanceChecklist(user) {
        return await this.performance.getPerformanceChecklist(user.companyId);
    }
    async hiringChecklist(user) {
        return await this.hiring.getHiringChecklist(user.companyId);
    }
    async attendanceChecklist(user) {
        return await this.attendance.getAttendanceChecklist(user.companyId);
    }
    async leaveChecklist(user) {
        return await this.leave.getLeaveChecklist(user.companyId);
    }
    async done(user, key) {
        await this.checklist.markExtraDone(user.companyId, key, user.id);
        return { status: 'success' };
    }
};
exports.ChecklistController = ChecklistController;
__decorate([
    (0, common_1.Get)('staff-progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "progress", null);
__decorate([
    (0, common_1.Get)('payroll-progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "payrollChecklist", null);
__decorate([
    (0, common_1.Get)('performance-progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "performanceChecklist", null);
__decorate([
    (0, common_1.Get)('hiring-progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "hiringChecklist", null);
__decorate([
    (0, common_1.Get)('attendance-progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "attendanceChecklist", null);
__decorate([
    (0, common_1.Get)('leave-progress'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "leaveChecklist", null);
__decorate([
    (0, common_1.Patch)('done'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChecklistController.prototype, "done", null);
exports.ChecklistController = ChecklistController = __decorate([
    (0, common_1.Controller)('checklist'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [staff_checklist_service_1.StaffChecklistService,
        checklist_service_1.ChecklistService,
        payroll_checklist_service_1.PayrollChecklistService,
        performance_checklist_service_1.PerformanceChecklistService,
        hiring_checklist_service_1.HiringChecklistService,
        attendance_checklist_service_1.AttendanceChecklistService,
        leave_checklist_service_1.LeaveChecklistService])
], ChecklistController);
//# sourceMappingURL=checklist.controller.js.map