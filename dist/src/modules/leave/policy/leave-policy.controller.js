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
exports.LeavePolicyController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_leave_policy_dto_1 = require("./dto/create-leave-policy.dto");
const update_leave_policy_dto_1 = require("./dto/update-leave-policy.dto");
const leave_policy_service_1 = require("./leave-policy.service");
const file_parse_interceptor_1 = require("../../../common/interceptor/file-parse.interceptor");
let LeavePolicyController = class LeavePolicyController extends base_controller_1.BaseController {
    constructor(leavePolicy) {
        super();
        this.leavePolicy = leavePolicy;
    }
    createLeavePolicy(dto, user, ip) {
        return this.leavePolicy.create(dto, user, ip);
    }
    async bulkCreateLeavePolicies(rows, user) {
        return this.leavePolicy.bulkCreateLeavePolicies(user.companyId, rows);
    }
    findAllLeavePolicies(user) {
        return this.leavePolicy.findAll(user.companyId);
    }
    findOneLeavePolicy(leaveTypeId, user) {
        return this.leavePolicy.findOne(user.companyId, leaveTypeId);
    }
    updateLeavePolicy(leaveTypeId, dto, user, ip) {
        return this.leavePolicy.update(leaveTypeId, dto, user, ip);
    }
    removeLeavePolicy(leaveTypeId, user, ip) {
        return this.leavePolicy.remove(leaveTypeId, user, ip);
    }
};
exports.LeavePolicyController = LeavePolicyController;
__decorate([
    (0, common_1.Post)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.policy.manage']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_leave_policy_dto_1.CreateLeavePolicyDto, Object, String]),
    __metadata("design:returntype", void 0)
], LeavePolicyController.prototype, "createLeavePolicy", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.policy.manage']),
    (0, common_1.UseInterceptors)((0, file_parse_interceptor_1.FileParseInterceptor)({ field: 'file', maxRows: 200 })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], LeavePolicyController.prototype, "bulkCreateLeavePolicies", null);
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.policy.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeavePolicyController.prototype, "findAllLeavePolicies", null);
__decorate([
    (0, common_1.Get)(':leaveTypeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.policy.read']),
    __param(0, (0, common_1.Param)('leaveTypeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeavePolicyController.prototype, "findOneLeavePolicy", null);
__decorate([
    (0, common_1.Patch)(':leaveTypeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.policy.manage']),
    __param(0, (0, common_1.Param)('leaveTypeId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_leave_policy_dto_1.UpdateLeavePolicyDto, Object, String]),
    __metadata("design:returntype", void 0)
], LeavePolicyController.prototype, "updateLeavePolicy", null);
__decorate([
    (0, common_1.Delete)(':leaveTypeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.policy.manage']),
    __param(0, (0, common_1.Param)('leaveTypeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], LeavePolicyController.prototype, "removeLeavePolicy", null);
exports.LeavePolicyController = LeavePolicyController = __decorate([
    (0, common_1.Controller)('leave-policy'),
    __metadata("design:paramtypes", [leave_policy_service_1.LeavePolicyService])
], LeavePolicyController);
//# sourceMappingURL=leave-policy.controller.js.map