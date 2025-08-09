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
exports.LeaveTypesController = void 0;
const common_1 = require("@nestjs/common");
const audit_decorator_1 = require("../../audit/audit.decorator");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_leave_type_dto_1 = require("./dto/create-leave-type.dto");
const update_leave_type_dto_1 = require("./dto/update-leave-type.dto");
const leave_types_service_1 = require("./leave-types.service");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
let LeaveTypesController = class LeaveTypesController extends base_controller_1.BaseController {
    constructor(leaveType) {
        super();
        this.leaveType = leaveType;
    }
    create(dto, user, ip) {
        return this.leaveType.create(dto, user, ip);
    }
    async bulkCreateLeaveTypes(rows, user) {
        return this.leaveType.bulkCreateLeaveTypes(user.companyId, rows);
    }
    findAll(user) {
        return this.leaveType.findAll(user.companyId);
    }
    findOne(id, user) {
        return this.leaveType.findOne(user.companyId, id);
    }
    update(id, dto, user, ip) {
        return this.leaveType.update(id, dto, user, ip);
    }
    remove(id, user, ip) {
        return this.leaveType.remove(id, user, ip);
    }
};
exports.LeaveTypesController = LeaveTypesController;
__decorate([
    (0, common_1.Post)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_leave_type_dto_1.CreateLeaveTypeDto, Object, String]),
    __metadata("design:returntype", void 0)
], LeaveTypesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    (0, audit_decorator_1.Audit)({ action: 'bulk Create Leave Types', entity: 'CostCenter' }),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 200 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], LeaveTypesController.prototype, "bulkCreateLeaveTypes", null);
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['leave.types.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeaveTypesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permission', ['leave.types.read']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeaveTypesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_leave_type_dto_1.UpdateLeaveTypeDto, Object, String]),
    __metadata("design:returntype", void 0)
], LeaveTypesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.types.manage']),
    (0, audit_decorator_1.Audit)({
        action: 'Delete',
        entity: 'leave',
        getEntityId: (req) => req.params.id,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], LeaveTypesController.prototype, "remove", null);
exports.LeaveTypesController = LeaveTypesController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('leave-types'),
    __metadata("design:paramtypes", [leave_types_service_1.LeaveTypesService])
], LeaveTypesController);
//# sourceMappingURL=leave-types.controller.js.map