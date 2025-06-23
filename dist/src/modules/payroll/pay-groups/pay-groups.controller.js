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
exports.PayGroupsController = void 0;
const common_1 = require("@nestjs/common");
const pay_groups_service_1 = require("./pay-groups.service");
const create_pay_group_dto_1 = require("./dto/create-pay-group.dto");
const update_pay_group_dto_1 = require("./dto/update-pay-group.dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
let PayGroupsController = class PayGroupsController extends base_controller_1.BaseController {
    constructor(payGroupsService) {
        super();
        this.payGroupsService = payGroupsService;
    }
    createEmployeeGroup(dto, user, ip) {
        return this.payGroupsService.create(user, dto, ip);
    }
    getEmployeeGroups(user) {
        return this.payGroupsService.findAll(user.companyId);
    }
    getEmployeeGroup(groupId) {
        return this.payGroupsService.findOne(groupId);
    }
    updateEmployeeGroup(dto, groupId, user, ip) {
        return this.payGroupsService.update(groupId, dto, user, ip);
    }
    deleteEmployeeGroup(groupId, user, ip) {
        return this.payGroupsService.remove(groupId, user, ip);
    }
    getEmployeesInGroup(groupId) {
        return this.payGroupsService.findEmployeesInGroup(groupId);
    }
    addEmployeeToGroup(employees, groupId, user, ip) {
        return this.payGroupsService.addEmployeesToGroup(employees, groupId, user, ip);
    }
    removeEmployeeFromGroup(employeeIds, user, ip) {
        const obj = employeeIds;
        const employeeId = obj.employee_id;
        return this.payGroupsService.removeEmployeesFromGroup(employeeId, user, ip);
    }
};
exports.PayGroupsController = PayGroupsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pay_group_dto_1.CreatePayGroupDto, Object, String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "createEmployeeGroup", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "getEmployeeGroups", null);
__decorate([
    (0, common_1.Get)(':groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.read']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "getEmployeeGroup", null);
__decorate([
    (0, common_1.Patch)(':groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_pay_group_dto_1.UpdatePayGroupDto, String, Object, String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "updateEmployeeGroup", null);
__decorate([
    (0, common_1.Delete)(':groupId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.manage']),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "deleteEmployeeGroup", null);
__decorate([
    (0, common_1.Get)(':groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.generate_id']),
    __param(0, (0, common_1.Param)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "getEmployeesInGroup", null);
__decorate([
    (0, common_1.Post)(':groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "addEmployeeToGroup", null);
__decorate([
    (0, common_1.Delete)(':groupId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['payroll.pay_groups.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], PayGroupsController.prototype, "removeEmployeeFromGroup", null);
exports.PayGroupsController = PayGroupsController = __decorate([
    (0, common_1.Controller)('pay-groups'),
    __metadata("design:paramtypes", [pay_groups_service_1.PayGroupsService])
], PayGroupsController);
//# sourceMappingURL=pay-groups.controller.js.map