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
exports.DepartmentController = void 0;
const common_1 = require("@nestjs/common");
const department_service_1 = require("./department.service");
const create_department_dto_1 = require("./dto/create-department.dto");
const update_department_dto_1 = require("./dto/update-department.dto");
const audit_decorator_1 = require("../../audit/audit.decorator");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const assign_head_dto_1 = require("./dto/assign-head.dto");
const assign_cost_center_dto_1 = require("./dto/assign-cost-center.dto");
const assign_parent_dto_1 = require("./dto/assign-parent.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
let DepartmentController = class DepartmentController extends base_controller_1.BaseController {
    constructor(departmentService) {
        super();
        this.departmentService = departmentService;
    }
    create(user, createDepartmentDto) {
        return this.departmentService.create(user.companyId, createDepartmentDto);
    }
    async bulkCreate(rows, user) {
        return this.departmentService.bulkCreate(user.companyId, rows);
    }
    findAll(user) {
        return this.departmentService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.departmentService.findOne(user.companyId, id);
    }
    update(id, updateDepartmentDto, user, ip) {
        return this.departmentService.update(user.companyId, id, updateDepartmentDto, user.id, ip);
    }
    remove(id, user) {
        return this.departmentService.remove(user.companyId, id);
    }
    assignHead(id, dto, user, ip) {
        return this.departmentService.assignHead(user.companyId, id, dto.headId, user.id, ip);
    }
    getDepartmentHead(id, user) {
        return this.departmentService.findOneWithHead(user.companyId, id);
    }
    assignParent(user, id, dto, ip) {
        return this.departmentService.assignParent(user.companyId, id, dto, user.id, ip);
    }
    assignCostCenter(user, id, dto, ip) {
        return this.departmentService.assignCostCenter(user.companyId, id, dto, user.id, ip);
    }
    getHierarchy(user) {
        return this.departmentService.getHierarchy(user.companyId);
    }
};
exports.DepartmentController = DepartmentController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Create',
        entity: 'Department',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_department_dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    (0, audit_decorator_1.Audit)({ action: 'Department Bulk Up', entity: 'Departments' }),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 200 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], DepartmentController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_department_dto_1.UpdateDepartmentDto, Object, String]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Delete',
        entity: 'Department',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    (0, common_1.Patch)('/:id/head'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_head_dto_1.AssignHeadDto, Object, String]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "assignHead", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.read']),
    (0, common_1.Get)('head/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "getDepartmentHead", null);
__decorate([
    (0, common_1.Patch)(':id/parent'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_parent_dto_1.AssignParentDto, String]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "assignParent", null);
__decorate([
    (0, common_1.Patch)(':id/cost-center'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.manage']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_cost_center_dto_1.AssignCostCenterDto, String]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "assignCostCenter", null);
__decorate([
    (0, common_1.Get)('/hierarchy/dept'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['department.hierarchy']),
    (0, audit_decorator_1.Audit)({ action: 'GetDepartmentHierarchy', entity: 'Department' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DepartmentController.prototype, "getHierarchy", null);
exports.DepartmentController = DepartmentController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('department'),
    __metadata("design:paramtypes", [department_service_1.DepartmentService])
], DepartmentController);
//# sourceMappingURL=department.controller.js.map