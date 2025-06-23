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
exports.EmployeeShiftsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const employee_shifts_service_1 = require("./employee-shifts.service");
const create_employee_shift_dto_1 = require("./dto/create-employee-shift.dto");
let EmployeeShiftsController = class EmployeeShiftsController extends base_controller_1.BaseController {
    constructor(employeeShiftsService) {
        super();
        this.employeeShiftsService = employeeShiftsService;
    }
    create(employeeId, dto, user, ip) {
        return this.employeeShiftsService.assignShift(employeeId, dto, user, ip);
    }
    async update(assignmentId, dto, user, ip) {
        return this.employeeShiftsService.updateShift(assignmentId, dto, user, ip);
    }
    async getCalendarEvents(user, start, end) {
        return this.employeeShiftsService.getCalendarEvents(user.companyId, start, end);
    }
    async bulkCreate(dto, user, ip) {
        return this.employeeShiftsService.bulkAssignMany(user.companyId, dto, user, ip);
    }
    async listAllPaginated(user, companyId, page = 1, limit = 20, search, shiftId) {
        return this.employeeShiftsService.listAllPaginated(user.companyId, {
            page: Number(page),
            limit: Number(limit),
            search,
            shiftId,
        });
    }
    async getAll(user) {
        return this.employeeShiftsService.listAll(user.companyId);
    }
    async getShiftAssignment(assignmentId, user) {
        return this.employeeShiftsService.getOne(user.companyId, assignmentId);
    }
    async getEmployeeShifts(employeeId, user) {
        return this.employeeShiftsService.listByEmployee(user.companyId, employeeId);
    }
    async getShiftEmployees(shiftId, user) {
        return this.employeeShiftsService.listByShift(user.companyId, shiftId);
    }
    async bulkRemove(employeeIds, user, ip) {
        return this.employeeShiftsService.bulkRemoveAssignments(employeeIds, user, ip);
    }
    async removeOne(assignmentId, user, ip) {
        return this.employeeShiftsService.removeAssignment(assignmentId, user, ip);
    }
};
exports.EmployeeShiftsController = EmployeeShiftsController;
__decorate([
    (0, common_1.Post)(':employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.assign']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_employee_shift_dto_1.CreateEmployeeShiftDto, Object, String]),
    __metadata("design:returntype", void 0)
], EmployeeShiftsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':assignmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.assign']),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_employee_shift_dto_1.CreateEmployeeShiftDto, Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('events/calendar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "getCalendarEvents", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.assign']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.assign']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('companyId')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('shiftId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "listAllPaginated", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)(':assignmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['employee_shifts.manage']),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "getShiftAssignment", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager', 'employee']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "getEmployeeShifts", null);
__decorate([
    (0, common_1.Get)('shift/:shiftId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager', 'employee']),
    __param(0, (0, common_1.Param)('shiftId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "getShiftEmployees", null);
__decorate([
    (0, common_1.Post)('bulk-remove'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "bulkRemove", null);
__decorate([
    (0, common_1.Delete)(':assignmentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], EmployeeShiftsController.prototype, "removeOne", null);
exports.EmployeeShiftsController = EmployeeShiftsController = __decorate([
    (0, common_1.Controller)('employee-shifts'),
    __metadata("design:paramtypes", [employee_shifts_service_1.EmployeeShiftsService])
], EmployeeShiftsController);
//# sourceMappingURL=employee-shifts.controller.js.map