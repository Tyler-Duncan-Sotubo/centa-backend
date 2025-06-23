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
exports.LeaveApprovalService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const leave_requests_schema_1 = require("../schema/leave-requests.schema");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const leave_balance_service_1 = require("../balance/leave-balance.service");
const leave_settings_service_1 = require("../settings/leave-settings.service");
const pusher_service_1 = require("../../notification/services/pusher.service");
let LeaveApprovalService = class LeaveApprovalService {
    constructor(db, auditService, leaveBalanceService, leaveSettingsService, pusher) {
        this.db = db;
        this.auditService = auditService;
        this.leaveBalanceService = leaveBalanceService;
        this.leaveSettingsService = leaveSettingsService;
        this.pusher = pusher;
    }
    async findOneById(leaveRequestId, companyId) {
        const [leaveRequest] = await this.db
            .select()
            .from(leave_requests_schema_1.leaveRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)))
            .execute();
        if (!leaveRequest) {
            throw new common_1.NotFoundException('Leave request not found');
        }
        return leaveRequest;
    }
    async approveLeaveRequest(leaveRequestId, dto, user, ip) {
        const isMultiLevel = await this.leaveSettingsService.isMultiLevelApproval(user.companyId);
        const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);
        if (leaveRequest.approverId !== user.id && user.role !== 'super_admin') {
            throw new common_1.BadRequestException('You are not authorized to approve this request');
        }
        if (leaveRequest.status !== 'pending') {
            throw new common_1.BadRequestException('Leave request is not in a state that can be approved');
        }
        if (isMultiLevel) {
            const approvalChain = Array.isArray(leaveRequest.approvalChain)
                ? leaveRequest.approvalChain
                : [];
            const currentApprover = approvalChain.find((level) => level.status === 'pending');
            if (!currentApprover) {
                throw new common_1.BadRequestException('No pending approver found.');
            }
            if (currentApprover.approverId !== user.id) {
                throw new common_1.BadRequestException('You are not authorized to approve this request.');
            }
            currentApprover.status = 'approved';
            currentApprover.actionedAt = new Date().toISOString();
            const stillPending = approvalChain.some((level) => level.status === 'pending');
            let newStatus = 'pending';
            let approvedAt = null;
            if (!stillPending) {
                newStatus = 'approved';
                approvedAt = new Date();
            }
            const updatedLeaveRequest = await this.db
                .update(leave_requests_schema_1.leaveRequests)
                .set({
                approvalChain,
                status: newStatus,
                approvedAt,
                approverId: user.id,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId))
                .returning()
                .execute();
            if (newStatus === 'approved') {
                await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(leaveRequest.leaveTypeId, leaveRequest.employeeId, new Date().getFullYear(), leaveRequest.totalDays, user.id);
            }
            await this.auditService.logAction({
                action: 'approve',
                entity: 'leave_request',
                details: 'Leave request approved',
                entityId: leaveRequestId,
                userId: user.id,
                ipAddress: ip,
                changes: { status: newStatus },
            });
            return updatedLeaveRequest;
        }
        else {
            const updatedLeaveRequest = await this.db
                .update(leave_requests_schema_1.leaveRequests)
                .set({ status: 'approved' })
                .where((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId))
                .returning()
                .execute();
            await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(leaveRequest.leaveTypeId, leaveRequest.employeeId, new Date().getFullYear(), leaveRequest.totalDays, user.id);
            await this.pusher.createEmployeeNotification(updatedLeaveRequest[0].companyId, updatedLeaveRequest[0].employeeId, `Your loan request has been approved!`, 'leave');
            await this.auditService.logAction({
                action: 'approve',
                entity: 'leave_request',
                details: 'Leave request approved',
                entityId: leaveRequestId,
                userId: user.id,
                ipAddress: ip,
                changes: { status: 'approved' },
            });
            return updatedLeaveRequest;
        }
    }
    async rejectLeaveRequest(leaveRequestId, dto, user, ip) {
        const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);
        if (leaveRequest.status !== 'pending') {
            throw new common_1.BadRequestException('Leave request is not pending.');
        }
        const isMultiLevel = await this.leaveSettingsService.isMultiLevelApproval(user.companyId);
        if (isMultiLevel && leaveRequest.approvalChain) {
            const approvalChain = Array.isArray(leaveRequest.approvalChain)
                ? leaveRequest.approvalChain
                : [];
            const currentApprover = approvalChain.find((level) => level.status === 'pending');
            if (!currentApprover) {
                throw new common_1.BadRequestException('No pending approver found.');
            }
            if (currentApprover.approverId !== user.id) {
                throw new common_1.BadRequestException('You are not authorized to reject this request.');
            }
            currentApprover.status = 'rejected';
            currentApprover.actionedAt = new Date().toISOString();
        }
        else {
            if (leaveRequest.approverId !== user.id) {
                throw new common_1.BadRequestException('You are not authorized to reject this request.');
            }
        }
        const updatedLeaveRequest = await this.db
            .update(leave_requests_schema_1.leaveRequests)
            .set({
            approvalChain: leaveRequest.approvalChain,
            status: 'rejected',
            rejectionReason: dto.rejectionReason,
            approverId: user.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId))
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'reject',
            entity: 'leave_request',
            details: 'Leave request rejected',
            entityId: leaveRequestId,
            userId: user.id,
            ipAddress: ip,
            changes: { status: 'rejected' },
        });
        await this.pusher.createEmployeeNotification(updatedLeaveRequest[0].companyId, updatedLeaveRequest[0].employeeId, `Your loan request has been rejected!`, 'leave');
        return updatedLeaveRequest;
    }
};
exports.LeaveApprovalService = LeaveApprovalService;
exports.LeaveApprovalService = LeaveApprovalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        leave_balance_service_1.LeaveBalanceService,
        leave_settings_service_1.LeaveSettingsService,
        pusher_service_1.PusherService])
], LeaveApprovalService);
//# sourceMappingURL=leave-approval.service.js.map