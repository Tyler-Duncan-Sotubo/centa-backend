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

@Injectable()
export class LeaveApprovalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly leaveSettingsService: LeaveSettingsService,
    private readonly pusher: PusherService,
  ) {}

  // find one by ID
  async findOneById(leaveRequestId: string, companyId: string) {
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
      // 1. Find current approver in approvalChain
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

      if (!currentApprover) {
        throw new BadRequestException('No pending approver found.');
      }

      // 2. Verify if CurrentUser is authorized
      if (currentApprover.approverId !== user.id) {
        throw new BadRequestException(
          'You are not authorized to approve this request.',
        );
      }

      // 3. Update approvalChain: mark current level as approved
      currentApprover.status = 'approved';
      currentApprover.actionedAt = new Date().toISOString();

      // 4. Check if there are more approvers pending
      const stillPending = approvalChain.some(
        (level) => level.status === 'pending',
      );

      let newStatus = 'pending';
      let approvedAt: Date | null = null;

      if (!stillPending) {
        newStatus = 'approved';
        approvedAt = new Date();
      }

      // 5. Update DB
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

      // 6. If fully approved, update leave balance
      if (newStatus === 'approved') {
        await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
          leaveRequest.leaveTypeId,
          leaveRequest.employeeId,
          new Date().getFullYear(),
          leaveRequest.totalDays,
          user.id,
        );
      }

      // 7. Audit Log
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
    } else {
      // Update Leave Request Status
      const updatedLeaveRequest = await this.db
        .update(leaveRequests)
        .set({ status: 'approved' })
        .where(eq(leaveRequests.id, leaveRequestId))
        .returning()
        .execute();

      // Update Leave Balance
      await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
        leaveRequest.leaveTypeId,
        leaveRequest.employeeId,
        new Date().getFullYear(),
        leaveRequest.totalDays,
        user.id,
      );

      // Send Notification //
      await this.pusher.createEmployeeNotification(
        updatedLeaveRequest[0].companyId,
        updatedLeaveRequest[0].employeeId,
        `Your loan request has been approved!`,
        'leave',
      );

      // Create Audit Record
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
      // If multi-level approval enabled
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

      if (!currentApprover) {
        throw new BadRequestException('No pending approver found.');
      }

      if (currentApprover.approverId !== user.id) {
        throw new BadRequestException(
          'You are not authorized to reject this request.',
        );
      }

      // Mark this approver's status as rejected
      currentApprover.status = 'rejected';
      currentApprover.actionedAt = new Date().toISOString();
    } else {
      // Single approver case
      if (leaveRequest.approverId !== user.id) {
        throw new BadRequestException(
          'You are not authorized to reject this request.',
        );
      }
    }

    // In either case, when rejected, mark overall leave request as rejected
    const updatedLeaveRequest = await this.db
      .update(leaveRequests)
      .set({
        approvalChain: leaveRequest.approvalChain, // Update if multi-level
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

    // Send Notification //
    await this.pusher.createEmployeeNotification(
      updatedLeaveRequest[0].companyId,
      updatedLeaveRequest[0].employeeId,
      `Your loan request has been rejected!`,
      'leave',
    );

    return updatedLeaveRequest;
  }
}
