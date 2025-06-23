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
exports.LeaveRequestController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../audit/audit.interceptor");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const create_leave_request_dto_1 = require("./dto/create-leave-request.dto");
const leave_request_service_1 = require("./leave-request.service");
let LeaveRequestController = class LeaveRequestController extends base_controller_1.BaseController {
    constructor(leaveRequest) {
        super();
        this.leaveRequest = leaveRequest;
    }
    createLeaveRequest(dto, user, ip) {
        return this.leaveRequest.applyForLeave(dto, user, ip);
    }
    getAllLeaveRequests(user) {
        return this.leaveRequest.findAll(user.companyId);
    }
    getLeaveRequestById(leaveRequestId, user) {
        return this.leaveRequest.findOneById(leaveRequestId, user.companyId);
    }
    getLeaveRequestByEmployeeId(employeeId, user) {
        return this.leaveRequest.findAllByEmployeeId(employeeId, user.companyId);
    }
};
exports.LeaveRequestController = LeaveRequestController;
__decorate([
    (0, common_1.Post)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.request.create']),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_leave_request_dto_1.CreateLeaveRequestDto, Object, String]),
    __metadata("design:returntype", void 0)
], LeaveRequestController.prototype, "createLeaveRequest", null);
__decorate([
    (0, common_1.Get)(''),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.request.read_all']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeaveRequestController.prototype, "getAllLeaveRequests", null);
__decorate([
    (0, common_1.Get)(':leaveRequestId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.request.read_all']),
    __param(0, (0, common_1.Param)('leaveRequestId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeaveRequestController.prototype, "getLeaveRequestById", null);
__decorate([
    (0, common_1.Get)('employee/:employeeId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['leave.request.read_employee']),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeaveRequestController.prototype, "getLeaveRequestByEmployeeId", null);
exports.LeaveRequestController = LeaveRequestController = __decorate([
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, common_1.Controller)('leave-request'),
    __metadata("design:paramtypes", [leave_request_service_1.LeaveRequestService])
], LeaveRequestController);
//# sourceMappingURL=leave-request.controller.js.map