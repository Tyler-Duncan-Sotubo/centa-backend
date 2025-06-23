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
exports.JobRolesController = void 0;
const common_1 = require("@nestjs/common");
const job_roles_service_1 = require("./job-roles.service");
const create_job_role_dto_1 = require("./dto/create-job-role.dto");
const update_job_role_dto_1 = require("./dto/update-job-role.dto");
const audit_decorator_1 = require("../../audit/audit.decorator");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
let JobRolesController = class JobRolesController extends base_controller_1.BaseController {
    constructor(jobRolesService) {
        super();
        this.jobRolesService = jobRolesService;
    }
    create(createJobRoleDto, user) {
        return this.jobRolesService.create(user.companyId, createJobRoleDto);
    }
    async bulkCreate(rows, user) {
        return this.jobRolesService.bulkCreate(user.companyId, rows);
    }
    findAll(user) {
        return this.jobRolesService.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.jobRolesService.findOne(user.companyId, id);
    }
    update(id, updateJobRoleDto, user, ip) {
        return this.jobRolesService.update(user.companyId, id, updateJobRoleDto, user.id, ip);
    }
    remove(id, user) {
        return this.jobRolesService.remove(user.companyId, id);
    }
};
exports.JobRolesController = JobRolesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['job_roles.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Create',
        entity: 'Job Role',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_job_role_dto_1.CreateJobRoleDto, Object]),
    __metadata("design:returntype", void 0)
], JobRolesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['job_roles.manage']),
    (0, audit_decorator_1.Audit)({ action: 'BulkCreateJobRoles', entity: 'JobRole' }),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 200 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], JobRolesController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['job_roles.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobRolesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['job_roles.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobRolesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['job_roles.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_job_role_dto_1.UpdateJobRoleDto, Object, String]),
    __metadata("design:returntype", void 0)
], JobRolesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['job_roles.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Delete',
        entity: 'Job Role',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], JobRolesController.prototype, "remove", null);
exports.JobRolesController = JobRolesController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('job-roles'),
    __metadata("design:paramtypes", [job_roles_service_1.JobRolesService])
], JobRolesController);
//# sourceMappingURL=job-roles.controller.js.map