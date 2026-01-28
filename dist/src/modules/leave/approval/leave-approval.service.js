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
const cache_service_1 = require("../../../common/cache/cache.service");
const push_notification_service_1 = require("../../notification/services/push-notification.service");
const leave_notification_service_1 = require("../../notification/services/leave-notification.service");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("../schema/leave-types.schema");
let LeaveApprovalService = class LeaveApprovalService {
    constructor(db, auditService, leaveBalanceService, leaveSettingsService, pusher, cache, push, leaveNotificationService) {
        this.db = db;
        this.auditService = auditService;
        this.leaveBalanceService = leaveBalanceService;
        this.leaveSettingsService = leaveSettingsService;
        this.pusher = pusher;
        this.cache = cache;
        this.push = push;
        this.leaveNotificationService = leaveNotificationService;
    }
    tags(companyId) {
        return [
            `company:${companyId}:leave`,
            `company:${companyId}:leave:requests`,
            `company:${companyId}:leave:approvals`,
        ];
    }
    async findOneById(leaveRequestId, companyId) {
        return this.cache.getOrSetVersioned(companyId, ['leave', 'request', 'one', leaveRequestId], async () => {
            const [leaveRequest] = await this.db
                .select()
                .from(leave_requests_schema_1.leaveRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId), (0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.companyId, companyId)))
                .execute();
            if (!leaveRequest) {
                throw new common_1.NotFoundException('Leave request not found');
            }
            return leaveRequest;
        }, { tags: this.tags(companyId) });
    }
    async approveLeaveRequest(leaveRequestId, dto, user, ip) {
        const isMultiLevel = await this.leaveSettingsService.isMultiLevelApproval(user.companyId);
        const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);
        if (!isMultiLevel) {
            if (leaveRequest.approverId !== user.id && user.role !== 'super_admin') {
                throw new common_1.BadRequestException('You are not authorized to approve this request');
            }
        }
        if (leaveRequest.status !== 'pending') {
            throw new common_1.BadRequestException('Leave request is not in a state that can be approved');
        }
        if (isMultiLevel) {
            const approvalChain = Array.isArray(leaveRequest.approvalChain)
                ? leaveRequest.approvalChain
                : [];
            if (!approvalChain.length) {
                throw new common_1.BadRequestException('Approval chain is empty.');
            }
            const currentIndex = approvalChain.findIndex((level) => level.status === 'pending');
            if (currentIndex === -1) {
                throw new common_1.BadRequestException('No pending approver found.');
            }
            const currentApprover = approvalChain[currentIndex];
            if (currentApprover.approverId !== user.id &&
                user.role !== 'super_admin') {
                throw new common_1.BadRequestException('You are not authorized to approve this request.');
            }
            approvalChain[currentIndex] = {
                ...currentApprover,
                status: 'approved',
                actionedAt: new Date().toISOString(),
            };
            const stillPending = approvalChain.some((level) => level.status === 'pending');
            const newStatus = stillPending
                ? 'pending'
                : 'approved';
            const approvedLevel = approvalChain.filter((l) => l.status === 'approved').length;
            const totalLevels = approvalChain.length;
            const approvedAt = newStatus === 'approved' ? new Date() : null;
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
            if (newStatus === 'approved') {
                const ctx = await this.getLeaveEmailContext(leaveRequest.employeeId, user.companyId, leaveRequest.leaveTypeId);
                await this.leaveNotificationService.sendLeaveDecisionEmail({
                    toEmail: ctx.employeeEmail,
                    managerName: ctx.managerName,
                    employeeName: ctx.employeeName,
                    leaveType: ctx.leaveTypeName,
                    startDate: leaveRequest.startDate,
                    endDate: leaveRequest.endDate,
                    totalDays: leaveRequest.totalDays,
                    companyName: ctx.companyName,
                    status: 'approved',
                    rejectionReason: dto.rejectionReason,
                    leaveRequestId: leaveRequest.id,
                });
                await this.pusher.createEmployeeNotification(updatedLeaveRequest[0].companyId, updatedLeaveRequest[0].employeeId, `Your leave request has been approved!`, 'leave');
                await this.push.createAndSendToEmployee(updatedLeaveRequest[0].employeeId, {
                    title: 'Update on your leave request',
                    body: `Your leave request has been approved!`,
                    route: '/screens/dashboard/leave/leave-history',
                    data: {
                        leaveRequestId: leaveRequest.id,
                    },
                    type: 'message',
                });
            }
            else {
                const nextIndex = approvalChain.findIndex((l) => l.status === 'pending');
                if (nextIndex !== -1) {
                    const nextApproverId = approvalChain[nextIndex].approverId;
                    const nextApprover = await this.getEmployeeContactForApproval(nextApproverId, user.companyId);
                    const ctx = await this.getLeaveEmailContext(leaveRequest.employeeId, user.companyId, leaveRequest.leaveTypeId);
                    await this.leaveNotificationService.sendLeaveApprovalRequestEmail({
                        toEmail: nextApprover.email,
                        managerName: nextApprover.fullName,
                        employeeName: ctx.employeeName,
                        leaveType: ctx.leaveTypeName,
                        startDate: leaveRequest.startDate,
                        endDate: leaveRequest.endDate,
                        totalDays: leaveRequest.totalDays,
                        companyName: ctx.companyName,
                        leaveRequestId: leaveRequest.id,
                    });
                    await this.pusher.createEmployeeNotification(user.companyId, nextApproverId, `A leave request needs your approval (${approvedLevel}/${totalLevels} approved so far).`, 'leave');
                    await this.push.createAndSendToEmployee(nextApproverId, {
                        title: 'Leave approval required',
                        body: `A leave request needs your approval (${approvedLevel}/${totalLevels}).`,
                        route: `/screens/dashboard/leave/approvals/${leaveRequestId}`,
                        data: { leaveRequestId },
                        type: 'message',
                    });
                }
            }
            await this.auditService.logAction({
                action: 'approve',
                entity: 'leave_request',
                details: stillPending
                    ? `Leave request approval level approved (${approvedLevel}/${totalLevels})`
                    : 'Leave request fully approved',
                entityId: leaveRequestId,
                userId: user.id,
                ipAddress: ip,
                changes: {
                    status: newStatus,
                    approvedLevel,
                    totalLevels,
                },
            });
            await this.cache.bumpCompanyVersion(user.companyId);
            return updatedLeaveRequest;
        }
        const updatedLeaveRequest = await this.db
            .update(leave_requests_schema_1.leaveRequests)
            .set({
            status: 'approved',
            approvedAt: new Date(),
            approverId: user.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(leave_requests_schema_1.leaveRequests.id, leaveRequestId))
            .returning()
            .execute();
        await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(leaveRequest.leaveTypeId, leaveRequest.employeeId, new Date().getFullYear(), leaveRequest.totalDays, user.id);
        const ctx = await this.getLeaveEmailContext(leaveRequest.employeeId, user.companyId, leaveRequest.leaveTypeId);
        await this.leaveNotificationService.sendLeaveDecisionEmail({
            toEmail: ctx.employeeEmail,
            managerName: ctx.managerName,
            employeeName: ctx.employeeName,
            leaveType: ctx.leaveTypeName,
            startDate: leaveRequest.startDate,
            endDate: leaveRequest.endDate,
            totalDays: leaveRequest.totalDays,
            companyName: ctx.companyName,
            status: 'approved',
            rejectionReason: dto.rejectionReason,
            leaveRequestId: leaveRequest.id,
        });
        await this.pusher.createEmployeeNotification(updatedLeaveRequest[0].companyId, updatedLeaveRequest[0].employeeId, `Your leave request has been approved!`, 'leave');
        await this.push.createAndSendToEmployee(updatedLeaveRequest[0].employeeId, {
            title: 'Update on your leave request',
            body: `Your leave request has been approved!`,
            route: '/screens/dashboard/leave/leave-history',
            data: { leaveRequestId: leaveRequest.id },
            type: 'message',
        });
        await this.auditService.logAction({
            action: 'approve',
            entity: 'leave_request',
            details: 'Leave request approved',
            entityId: leaveRequestId,
            userId: user.id,
            ipAddress: ip,
            changes: { status: 'approved' },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return updatedLeaveRequest;
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
            if (!currentApprover)
                throw new common_1.BadRequestException('No pending approver found.');
            if (currentApprover.approverId !== user.id) {
                throw new common_1.BadRequestException('You are not authorized to reject this request.');
            }
            currentApprover.status = 'rejected';
            currentApprover.actionedAt = new Date().toISOString();
            const updatedLeaveRequest = await this.db
                .update(leave_requests_schema_1.leaveRequests)
                .set({
                approvalChain,
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
            const ctx = await this.getLeaveEmailContext(leaveRequest.employeeId, user.companyId, leaveRequest.leaveTypeId);
            await this.leaveNotificationService.sendLeaveDecisionEmail({
                toEmail: ctx.employeeEmail,
                managerName: ctx.managerName,
                employeeName: ctx.employeeName,
                leaveType: ctx.leaveTypeName,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                totalDays: leaveRequest.totalDays,
                companyName: ctx.companyName,
                status: 'rejected',
                rejectionReason: dto.rejectionReason,
                leaveRequestId: leaveRequest.id,
            });
            await this.pusher.createEmployeeNotification(updatedLeaveRequest[0].companyId, updatedLeaveRequest[0].employeeId, `Your leave request has been rejected!`, 'leave');
            await this.push.createAndSendToEmployee(updatedLeaveRequest[0].employeeId, {
                title: 'Update on your leave request',
                body: `Your leave request has been rejected!`,
                route: '/screens/dashboard/leave/leave-history',
                data: {},
                type: 'message',
            });
            await this.cache.bumpCompanyVersion(user.companyId);
            return updatedLeaveRequest;
        }
        else {
            const updatedLeaveRequest = await this.db
                .update(leave_requests_schema_1.leaveRequests)
                .set({
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
            await this.pusher.createEmployeeNotification(updatedLeaveRequest[0].companyId, updatedLeaveRequest[0].employeeId, `Your leave request has been rejected!`, 'leave');
            await this.cache.bumpCompanyVersion(user.companyId);
            return updatedLeaveRequest;
        }
    }
    async getLeaveEmailContext(employeeId, companyId, leaveTypeId) {
        const [employee] = await this.db
            .select({
            id: schema_1.employees.id,
            firstName: schema_1.employees.firstName,
            email: schema_1.employees.email,
            managerId: schema_1.employees.managerId,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .execute();
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found');
        }
        let managerName = 'Manager';
        let managerEmail = null;
        if (employee.managerId) {
            const [manager] = await this.db
                .select({
                firstName: schema_1.employees.firstName,
                email: schema_1.employees.email,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employee.managerId))
                .execute();
            if (manager) {
                managerName = manager.firstName || managerName;
                managerEmail = manager.email || null;
            }
        }
        const [companyRow] = await this.db
            .select({ name: schema_1.companies.name })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .execute();
        const companyName = companyRow?.name ?? 'CentaHR';
        const [leaveType] = await this.db
            .select({
            name: leave_types_schema_1.leaveTypes.name,
        })
            .from(leave_types_schema_1.leaveTypes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.id, leaveTypeId), (0, drizzle_orm_1.eq)(leave_types_schema_1.leaveTypes.companyId, companyId)))
            .execute();
        const leaveTypeName = leaveType?.name ?? 'Leave';
        return {
            employeeId: employee.id,
            employeeName: employee.firstName,
            employeeEmail: employee.email,
            managerId: employee.managerId ?? null,
            managerName,
            managerEmail,
            companyName,
            leaveTypeName,
        };
    }
    async getEmployeeContactForApproval(employeeId, companyId) {
        const [emp] = await this.db
            .select({
            id: schema_1.employees.id,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            email: schema_1.employees.email,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
            .limit(1)
            .execute();
        if (!emp) {
            throw new common_1.BadRequestException('Next approver not found.');
        }
        return {
            employeeId: emp.id,
            email: emp.email,
            fullName: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
        };
    }
};
exports.LeaveApprovalService = LeaveApprovalService;
exports.LeaveApprovalService = LeaveApprovalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        leave_balance_service_1.LeaveBalanceService,
        leave_settings_service_1.LeaveSettingsService,
        pusher_service_1.PusherService,
        cache_service_1.CacheService,
        push_notification_service_1.PushNotificationService,
        leave_notification_service_1.LeaveNotificationService])
], LeaveApprovalService);
//# sourceMappingURL=leave-approval.service.js.map