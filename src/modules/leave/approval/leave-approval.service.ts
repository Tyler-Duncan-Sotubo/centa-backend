import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { leaveRequests } from '../schema/leave-requests.schema';
import { eq, and } from 'drizzle-orm';
import { AuditService } from 'src/modules/audit/audit.service';
import { LeaveBalanceService } from '../balance/leave-balance.service';
import { ApproveRejectLeaveDto } from './dto/approve-reject.dto';
import { LeaveSettingsService } from '../settings/leave-settings.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import { CacheService } from 'src/common/cache/cache.service';
import { PushNotificationService } from 'src/modules/notification/services/push-notification.service';

@Injectable()
export class LeaveApprovalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly leaveSettingsService: LeaveSettingsService,
    private readonly pusher: PusherService,
    private readonly cache: CacheService,
    private readonly push: PushNotificationService,
  ) {}

  /** cache tags used for this domain (lets CacheService pick TTL centrally) */
  private tags(companyId: string) {
    return [
      `company:${companyId}:leave`,
      `company:${companyId}:leave:requests`,
      `company:${companyId}:leave:approvals`,
    ];
  }

  /** Get one leave request (cached, versioned by company) */
  async findOneById(leaveRequestId: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['leave', 'request', 'one', leaveRequestId],
      async () => {
        const [leaveRequest] = await this.db
          .select()
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.id, leaveRequestId),
              eq(leaveRequests.companyId, companyId),
            ),
          )
          .execute();

        if (!leaveRequest) {
          throw new NotFoundException('Leave request not found');
        }
        return leaveRequest;
      },
      { tags: this.tags(companyId) },
    );
  }

  // Approve Leave Request
  async approveLeaveRequest(
    leaveRequestId: string,
    dto: ApproveRejectLeaveDto,
    user: User,
    ip: string,
  ) {
    const isMultiLevel = await this.leaveSettingsService.isMultiLevelApproval(
      user.companyId,
    );
    const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);

    if (leaveRequest.approverId !== user.id && user.role !== 'super_admin') {
      throw new BadRequestException(
        'You are not authorized to approve this request',
      );
    }
    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        'Leave request is not in a state that can be approved',
      );
    }

    if (isMultiLevel) {
      // 1) Resolve current approver in chain
      const approvalChain: Array<{
        approverId: string;
        status: string;
        actionedAt?: string;
      }> = Array.isArray(leaveRequest.approvalChain)
        ? leaveRequest.approvalChain
        : [];
      const currentApprover = approvalChain.find(
        (level) => level.status === 'pending',
      );
      if (!currentApprover)
        throw new BadRequestException('No pending approver found.');
      if (currentApprover.approverId !== user.id) {
        throw new BadRequestException(
          'You are not authorized to approve this request.',
        );
      }

      // 2) Mark this level approved
      currentApprover.status = 'approved';
      currentApprover.actionedAt = new Date().toISOString();

      // 3) Determine overall status
      const stillPending = approvalChain.some(
        (level) => level.status === 'pending',
      );
      const newStatus = stillPending ? 'pending' : 'approved';
      const approvedAt = stillPending ? null : new Date();

      // 4) Persist
      const updatedLeaveRequest = await this.db
        .update(leaveRequests)
        .set({
          approvalChain,
          status: newStatus,
          approvedAt,
          approverId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, leaveRequestId))
        .returning()
        .execute();

      // 5) Apply balance only when fully approved
      if (newStatus === 'approved') {
        await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
          leaveRequest.leaveTypeId,
          leaveRequest.employeeId,
          new Date().getFullYear(),
          leaveRequest.totalDays,
          user.id,
        );
      }

      // 6) Audit
      await this.auditService.logAction({
        action: 'approve',
        entity: 'leave_request',
        details: 'Leave request approved',
        entityId: leaveRequestId,
        userId: user.id,
        ipAddress: ip,
        changes: { status: newStatus },
      });

      // 7) Invalidate (version bump clears all versioned keys for this company)
      await this.cache.bumpCompanyVersion(user.companyId);

      return updatedLeaveRequest;
    } else {
      // Single-level approval: update status
      const updatedLeaveRequest = await this.db
        .update(leaveRequests)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approverId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, leaveRequestId))
        .returning()
        .execute();

      // Update leave balance
      await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
        leaveRequest.leaveTypeId,
        leaveRequest.employeeId,
        new Date().getFullYear(),
        leaveRequest.totalDays,
        user.id,
      );

      // Notify
      await this.pusher.createEmployeeNotification(
        updatedLeaveRequest[0].companyId,
        updatedLeaveRequest[0].employeeId,
        `Your leave request has been approved!`,
        'leave',
      );

      await this.push.createAndSendToEmployee(
        updatedLeaveRequest[0].employeeId,
        {
          title: 'Update on your leave request',
          body: `Your leave request has been approved!`,
          route: '/screens/dashboard/leave/leave-history',
          data: {},
          type: 'message',
        },
      );

      // Audit
      await this.auditService.logAction({
        action: 'approve',
        entity: 'leave_request',
        details: 'Leave request approved',
        entityId: leaveRequestId,
        userId: user.id,
        ipAddress: ip,
        changes: { status: 'approved' },
      });

      // Invalidate caches
      await this.cache.bumpCompanyVersion(user.companyId);

      return updatedLeaveRequest;
    }
  }

  // Reject Leave Request
  async rejectLeaveRequest(
    leaveRequestId: string,
    dto: ApproveRejectLeaveDto,
    user: User,
    ip: string,
  ) {
    const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);
    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException('Leave request is not pending.');
    }

    const isMultiLevel = await this.leaveSettingsService.isMultiLevelApproval(
      user.companyId,
    );

    if (isMultiLevel && leaveRequest.approvalChain) {
      const approvalChain: Array<{
        approverId: string;
        status: string;
        actionedAt?: string;
      }> = Array.isArray(leaveRequest.approvalChain)
        ? leaveRequest.approvalChain
        : [];
      const currentApprover = approvalChain.find(
        (level) => level.status === 'pending',
      );
      if (!currentApprover)
        throw new BadRequestException('No pending approver found.');
      if (currentApprover.approverId !== user.id) {
        throw new BadRequestException(
          'You are not authorized to reject this request.',
        );
      }
      currentApprover.status = 'rejected';
      currentApprover.actionedAt = new Date().toISOString();

      // Persist chain + overall status rejected
      const updatedLeaveRequest = await this.db
        .update(leaveRequests)
        .set({
          approvalChain,
          status: 'rejected',
          rejectionReason: dto.rejectionReason,
          approverId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, leaveRequestId))
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

      await this.pusher.createEmployeeNotification(
        updatedLeaveRequest[0].companyId,
        updatedLeaveRequest[0].employeeId,
        `Your leave request has been rejected!`,
        'leave',
      );

      await this.push.createAndSendToEmployee(
        updatedLeaveRequest[0].employeeId,
        {
          title: 'Update on your leave request',
          body: `Your leave request has been rejected!`,
          route: '/screens/dashboard/leave/leave-history',
          data: {},
          type: 'message',
        },
      );

      // Invalidate caches
      await this.cache.bumpCompanyVersion(user.companyId);

      return updatedLeaveRequest;
    } else {
      // Single-level rejection
      const updatedLeaveRequest = await this.db
        .update(leaveRequests)
        .set({
          status: 'rejected',
          rejectionReason: dto.rejectionReason,
          approverId: user.id,
          updatedAt: new Date(),
        })
        .where(eq(leaveRequests.id, leaveRequestId))
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

      await this.pusher.createEmployeeNotification(
        updatedLeaveRequest[0].companyId,
        updatedLeaveRequest[0].employeeId,
        `Your leave request has been rejected!`,
        'leave',
      );

      await this.cache.bumpCompanyVersion(user.companyId);

      return updatedLeaveRequest;
    }
  }
}
