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
exports.PaySchedulesController = void 0;
const common_1 = require("@nestjs/common");
const pay_schedules_service_1 = require("./pay-schedules.service");
const create_pay_schedule_dto_1 = require("./dto/create-pay-schedule.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let PaySchedulesController = class PaySchedulesController extends base_controller_1.BaseController {
    constructor(paySchedulesService) {
        super();
        this.paySchedulesService = paySchedulesService;
    }
    createPaySchedule(dto, user) {
        return this.paySchedulesService.createPayFrequency(user.companyId, dto);
    }
    listPaySchedules(user) {
        return this.paySchedulesService.getCompanyPaySchedule(user.companyId);
    }
    findOne(scheduleId) {
        return this.paySchedulesService.findOne(scheduleId);
    }
    getNextPayDate(user) {
        return this.paySchedulesService.getNextPayDate(user.companyId);
    }
    getRawPaySchedules(user) {
        return this.paySchedulesService.listPaySchedulesForCompany(user.companyId);
    }
    updatePaySchedule(scheduleId, dto, user) {
        return this.paySchedulesService.updatePayFrequency(user, dto, scheduleId);
    }
    deletePaySchedule(scheduleId, user, ip) {
        return this.paySchedulesService.deletePaySchedule(scheduleId, user, ip);
    }
};
exports.PaySchedulesController = PaySchedulesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pay_schedule_dto_1.CreatePayScheduleDto, Object]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "createPaySchedule", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "listPaySchedules", null);
__decorate([
    (0, common_1.Get)(':scheduleId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.read']),
    __param(0, (0, common_1.Param)('scheduleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('next-pay-date'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "getNextPayDate", null);
__decorate([
    (0, common_1.Get)('raw'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "getRawPaySchedules", null);
__decorate([
    (0, common_1.Patch)(':scheduleId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.manage']),
    __param(0, (0, common_1.Param)('scheduleId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_pay_schedule_dto_1.CreatePayScheduleDto, Object]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "updatePaySchedule", null);
__decorate([
    (0, common_1.Delete)(':scheduleId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_schedules.manage']),
    __param(0, (0, common_1.Param)('scheduleId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], PaySchedulesController.prototype, "deletePaySchedule", null);
exports.PaySchedulesController = PaySchedulesController = __decorate([
    (0, common_1.Controller)('pay-schedules'),
    __metadata("design:paramtypes", [pay_schedules_service_1.PaySchedulesService])
], PaySchedulesController);
//# sourceMappingURL=pay-schedules.controller.js.map