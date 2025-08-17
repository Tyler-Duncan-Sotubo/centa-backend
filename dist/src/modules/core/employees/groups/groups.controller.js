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
exports.GroupsController = void 0;
const common_1 = require("@nestjs/common");
const groups_service_1 = require("./groups.service");
const create_group_dto_1 = require("./dto/create-group.dto");
const update_group_dto_1 = require("./dto/update-group.dto");
const audit_decorator_1 = require("../../../audit/audit.decorator");
const audit_interceptor_1 = require("../../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
let GroupsController = class GroupsController extends base_controller_1.BaseController {
    constructor(groupsService) {
        super();
        this.groupsService = groupsService;
    }
    create(createGroupDto, user, ip) {
        return this.groupsService.create(createGroupDto, user, ip);
    }
    addMembers(id, employeeIds, user, ip) {
        return this.groupsService.addMembers(id, employeeIds, user, ip);
    }
    findAll(user) {
        return this.groupsService.findAll(user.companyId);
    }
    findOne(id) {
        return this.groupsService.findOne(id);
    }
    update(id, updateGroupDto, user, ip) {
        return this.groupsService.update(id, updateGroupDto, user, ip);
    }
    remove(id, user) {
        return this.groupsService.remove(id, user);
    }
    removeMembers(id, employeeIds, user, ip) {
        return this.groupsService.removeMembers(id, employeeIds, user, ip);
    }
};
exports.GroupsController = GroupsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_group_dto_1.CreateGroupDto, Object, String]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_group_dto_1.AddGroupMembersDto, Object, String]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "addMembers", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_group_dto_1.UpdateGroupDto, Object, String]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    (0, audit_decorator_1.Audit)({
        action: 'DeleteGroup',
        entity: 'Group',
        getEntityId: (req) => req.params.id,
    }),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "remove", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('roles', ['super_admin', 'hr_manager']),
    (0, common_1.Delete)(':id/members'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_group_dto_1.AddGroupMembersDto, Object, String]),
    __metadata("design:returntype", void 0)
], GroupsController.prototype, "removeMembers", null);
exports.GroupsController = GroupsController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('employee-groups'),
    __metadata("design:paramtypes", [groups_service_1.GroupsService])
], GroupsController);
//# sourceMappingURL=groups.controller.js.map