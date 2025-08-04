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
exports.EmployeesController = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("./employees.service");
const audit_decorator_1 = require("../../audit/audit.decorator");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_employee_core_dto_1 = require("./dto/create-employee-core.dto");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
const search_employees_dto_1 = require("./dto/search-employees.dto");
const create_employee_multi_details_dto_1 = require("./dto/create-employee-multi-details.dto");
const update_employee_details_dto_1 = require("./dto/update-employee-details.dto");
let EmployeesController = class EmployeesController extends base_controller_1.BaseController {
    constructor(employeesService) {
        super();
        this.employeesService = employeesService;
    }
    async downloadTemplate(reply) {
        const workbook = await this.employeesService.buildTemplateWorkbook('bf82fb49-2d08-4a2b-a117-be9039041f5f');
        const buffer = await workbook.xlsx.writeBuffer();
        reply
            .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .header('Content-Disposition', 'attachment; filename="employee_bulk_template.xlsx"')
            .send(buffer);
    }
    async bulkCreate(rows, user) {
        return this.employeesService.bulkCreate(user, rows);
    }
    async createEmployeeNumber(user) {
        return this.employeesService.createEmployeeNumber(user.companyId);
    }
    create(createEmployeeDto, user) {
        return this.employeesService.create(createEmployeeDto, user);
    }
    createEmployee(createEmployeeDto, user, employeeId) {
        return this.employeesService.createEmployee(createEmployeeDto, user, employeeId);
    }
    findAllEmployees(user) {
        return this.employeesService.findAllEmployees(user.companyId);
    }
    findAllCompanyEmployees(user) {
        return this.employeesService.findAllEmployees(user.companyId);
    }
    findAllCompanyEmployeesSummary(user, search) {
        return this.employeesService.findAllCompanyEmployeesSummary(user.companyId, search);
    }
    getActiveEmployees(user) {
        return this.employeesService.getEmployeeByUserId(user.id);
    }
    getEmployeeSalary(user, employeeId) {
        return this.employeesService.employeeSalaryDetails(user, employeeId);
    }
    employeeFinanceDetails(employeeId) {
        return this.employeesService.employeeFinanceDetails(employeeId);
    }
    findAll(user, id) {
        return this.employeesService.findAll(id, user.companyId);
    }
    findOne(id, user) {
        return this.employeesService.findOne(id, user.companyId);
    }
    update(id, dto, user, ip) {
        return this.employeesService.update(id, dto, user.id, ip);
    }
    remove(id) {
        return this.employeesService.remove(id);
    }
    findAllManagers(user) {
        return this.employeesService.getManagers(user.companyId);
    }
    updateManagerId(id, managerId) {
        return this.employeesService.assignManager(id, managerId);
    }
    removeManagerId(id) {
        return this.employeesService.removeManager(id);
    }
    async getFallbackManagers(user) {
        return this.employeesService.findFallbackManagers(user.companyId);
    }
    search(params) {
        return this.employeesService.search(params);
    }
};
exports.EmployeesController = EmployeesController;
__decorate([
    (0, common_1.Get)('template'),
    (0, common_1.SetMetadata)('permission', ['employees.download_template']),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, audit_decorator_1.Audit)({ action: 'Department Bulk Up', entity: 'Departments' }),
    (0, common_1.SetMetadata)('permission', ['employees.bulk_create']),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 600 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Post)('generate-id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.generate_id']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "createEmployeeNumber", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Create',
        entity: 'Employee',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_core_dto_1.CreateEmployeeCoreDto, Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('multi/:employeeId?'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Create',
        entity: 'Employee',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_employee_multi_details_dto_1.CreateEmployeeMultiDetailsDto, Object, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAllEmployees", null);
__decorate([
    (0, common_1.Get)('all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAllCompanyEmployees", null);
__decorate([
    (0, common_1.Get)('all/summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAllCompanyEmployeesSummary", null);
__decorate([
    (0, common_1.Get)('employee-active'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_self']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "getActiveEmployees", null);
__decorate([
    (0, common_1.Get)('employee/salary/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_self']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "getEmployeeSalary", null);
__decorate([
    (0, common_1.Get)('employee/finance/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_self']),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "employeeFinanceDetails", null);
__decorate([
    (0, common_1.Get)(':id/full'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_full']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_one']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_employee_details_dto_1.EmployeeProfileDto, Object, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Delete',
        entity: 'Employee',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('company-managers/all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAllManagers", null);
__decorate([
    (0, common_1.Patch)('assign-manager/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.assign_manager']),
    (0, audit_decorator_1.Audit)({
        action: 'Update',
        entity: 'Employee',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('managerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "updateManagerId", null);
__decorate([
    (0, common_1.Patch)('remove-manager/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.assign_manager']),
    (0, audit_decorator_1.Audit)({
        action: 'Update',
        entity: 'Employee',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "removeManagerId", null);
__decorate([
    (0, common_1.Get)('fallback-managers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['employees.fallback_managers']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmployeesController.prototype, "getFallbackManagers", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.SetMetadata)('permission', ['employees.search']),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_employees_dto_1.SearchEmployeesDto]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "search", null);
exports.EmployeesController = EmployeesController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('employees'),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService])
], EmployeesController);
//# sourceMappingURL=employees.controller.js.map