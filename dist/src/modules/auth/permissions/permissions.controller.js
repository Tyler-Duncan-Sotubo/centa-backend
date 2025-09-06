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
exports.PermissionsController = void 0;
const common_1 = require("@nestjs/common");
const permissions_service_1 = require("./permissions.service");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const current_user_decorator_1 = require("../decorator/current-user.decorator");
const create_permission_dto_1 = require("./dto/create-permission.dto");
const update_company_permission_dto_1 = require("./dto/update-company-permission.dto");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const permission_keys_1 = require("./permission-keys");
let PermissionsController = class PermissionsController extends base_controller_1.BaseController {
    constructor(permissionsService) {
        super();
        this.permissionsService = permissionsService;
    }
    seedPermissions() {
        return this.permissionsService.create();
    }
    syncAllCompanyPermissions() {
        return this.permissionsService.syncAllCompanyPermissions();
    }
    findAllPermissions() {
        return this.permissionsService.findAll();
    }
    findAllCompanyRoles(user) {
        return this.permissionsService.getRolesByCompany(user.companyId);
    }
    createCompanyRole(user, name) {
        return this.permissionsService.createRole(user.companyId, name);
    }
    findCompanyRoleById(user, roleId, name) {
        return this.permissionsService.updateRole(user.companyId, roleId, name);
    }
    async syncCompanyPermissions() {
        return this.permissionsService.syncAllCompanyPermissions();
    }
    assignPermissionToRole(user, dto) {
        return this.permissionsService.assignPermissionToRole(user.companyId, dto.roleId, dto.permissionId);
    }
    findAllUserPermissions(user) {
        return this.permissionsService.getCompanyPermissionsSummary(user.companyId);
    }
    async updatePermissions(user, body, ip) {
        const { rolePermissions } = body;
        await this.permissionsService.updateCompanyRolePermissions(rolePermissions, user, ip);
        return { message: 'Permissions updated successfully' };
    }
};
exports.PermissionsController = PermissionsController;
__decorate([
    (0, common_1.Post)('seed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "seedPermissions", null);
__decorate([
    (0, common_1.Post)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "syncAllCompanyPermissions", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.PermissionsRead]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findAllPermissions", null);
__decorate([
    (0, common_1.Get)('company/roles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.RolesRead]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findAllCompanyRoles", null);
__decorate([
    (0, common_1.Post)('company/roles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.RolesManage]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "createCompanyRole", null);
__decorate([
    (0, common_1.Patch)('company/roles/:roleId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.RolesManage]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('roleId')),
    __param(2, (0, common_1.Body)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findCompanyRoleById", null);
__decorate([
    (0, common_1.Post)('company/sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "syncCompanyPermissions", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.PermissionsManage]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_permission_dto_1.CreatePermissionDto]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "assignPermissionToRole", null);
__decorate([
    (0, common_1.Get)('company-all'),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.PermissionsRead]),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PermissionsController.prototype, "findAllUserPermissions", null);
__decorate([
    (0, common_1.Patch)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', [permission_keys_1.Permission.PermissionsManage]),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_company_permission_dto_1.UpdateCompanyPermissionsDto, String]),
    __metadata("design:returntype", Promise)
], PermissionsController.prototype, "updatePermissions", null);
exports.PermissionsController = PermissionsController = __decorate([
    (0, common_1.Controller)('permissions'),
    __metadata("design:paramtypes", [permissions_service_1.PermissionsService])
], PermissionsController);
//# sourceMappingURL=permissions.controller.js.map