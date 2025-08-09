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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class LeaveApprovalService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly leaveBalanceService: LeaveBalanceService,
    private readonly leaveSettingsService: LeaveSettingsService,
    private readonly pusher: PusherService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(LeaveApprovalService.name);
  }

  // --------------- cache keys & helpers ---------------
  private detailKey(companyId: string, leaveRequestId: string) {
    return `company:${companyId}:leave:req:${leaveRequestId}:detail`;
  }
  private async burstDetail(companyId: string, leaveRequestId: string) {
    try {
      await this.cache.del(this.detailKey(companyId, leaveRequestId));
      this.logger.debug(
        { companyId, leaveRequestId },
        'cache:del:leave-request-detail',
      );
    } catch (e: any) {
      this.logger.warn(
        { err: e?.message, companyId, leaveRequestId },
        'cache:del:leave-request-detail:failed',
      );
    }
  }

  // --------------- find one ---------------
  async findOneById(leaveRequestId: string, companyId: string) {
    const key = this.detailKey(companyId, leaveRequestId);
    this.logger.debug(
      { companyId, leaveRequestId, key },
      'findOneById:cache:get',
    );

    const row = await this.cache.getOrSetCache(key, async () => {
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
        // Avoid caching negatives; just throw
        this.logger.warn(
          { companyId, leaveRequestId },
          'findOneById:not-found',
        );
        throw new NotFoundException('Leave request not found');
      }

      return leaveRequest;
    });

    return row;
  }

  // --------------- approve ---------------
  async approveLeaveRequest(
    leaveRequestId: string,
    dto: ApproveRejectLeaveDto,
    user: User,
    ip: string,
  ) {
    this.logger.info(
      { leaveRequestId, userId: user.id, companyId: user.companyId },
      'approveLeaveRequest:start',
    );

    const isMultiLevel = await this.leaveSettingsService.isMultiLevelApproval(
      user.companyId,
    );

    const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);

    if (leaveRequest.approverId !== user.id && user.role !== 'super_admin') {
      this.logger.warn(
        {
          leaveRequestId,
          approverId: leaveRequest.approverId,
          userId: user.id,
        },
        'approveLeaveRequest:unauthorized',
      );
      throw new BadRequestException(
        'You are not authorized to approve this request',
      );
    }

    if (leaveRequest.status !== 'pending') {
      this.logger.warn(
        { leaveRequestId, status: leaveRequest.status },
        'approveLeaveRequest:invalid-status',
      );
      throw new BadRequestException(
        'Leave request is not in a state that can be approved',
      );
    }

    if (isMultiLevel) {
      // 1) Resolve & validate chain
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
        this.logger.error(
          { leaveRequestId },
          'approveLeaveRequest:no-pending-approver',
        );
        throw new BadRequestException('No pending approver found.');
      }

      if (currentApprover.approverId !== user.id) {
        this.logger.warn(
          {
            leaveRequestId,
            expected: currentApprover.approverId,
            actual: user.id,
          },
          'approveLeaveRequest:wrong-approver',
        );
        throw new BadRequestException(
          'You are not authorized to approve this request.',
        );
      }

      // 2) Mark this level approved
      currentApprover.status = 'approved';
      currentApprover.actionedAt = new Date().toISOString();

      // 3) Determine new overall status
      const stillPending = approvalChain.some(
        (level) => level.status === 'pending',
      );
      const newStatus = stillPending ? 'pending' : 'approved';
      const approvedAt = stillPending ? null : new Date();

      // 4) Persist
      const [updated] = await this.db
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

      // 5) Update balance if fully approved
      if (newStatus === 'approved') {
        await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
          leaveRequest.leaveTypeId,
          leaveRequest.employeeId,
          new Date().getFullYear(),
          leaveRequest.totalDays,
          user.id,
        );

        // Notification
        await this.pusher.createEmployeeNotification(
          updated.companyId,
          updated.employeeId,
          `Your leave request has been approved!`,
          'leave',
        );
      }

      // 6) Audit
      await this.auditService.logAction({
        action: 'approve',
        entity: 'leave_request',
        details: 'Leave request approved (multi-level step)',
        entityId: leaveRequestId,
        userId: user.id,
        ipAddress: ip,
        changes: { status: newStatus },
      });

      // 7) Cache bust
      await this.burstDetail(user.companyId, leaveRequestId);

      this.logger.info(
        { leaveRequestId, status: newStatus },
        'approveLeaveRequest:done',
      );
      return updated;
    } else {
      // Single approver path
      const [updated] = await this.db
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

      await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
        leaveRequest.leaveTypeId,
        leaveRequest.employeeId,
        new Date().getFullYear(),
        leaveRequest.totalDays,
        user.id,
      );

      await this.pusher.createEmployeeNotification(
        updated.companyId,
        updated.employeeId,
        `Your leave request has been approved!`,
        'leave',
      );

      await this.auditService.logAction({
        action: 'approve',
        entity: 'leave_request',
        details: 'Leave request approved',
        entityId: leaveRequestId,
        userId: user.id,
        ipAddress: ip,
        changes: { status: 'approved' },
      });

      await this.burstDetail(user.companyId, leaveRequestId);

      this.logger.info(
        { leaveRequestId, status: 'approved' },
        'approveLeaveRequest:done',
      );
      return updated;
    }
  }

  // --------------- reject ---------------
  async rejectLeaveRequest(
    leaveRequestId: string,
    dto: ApproveRejectLeaveDto,
    user: User,
    ip: string,
  ) {
    this.logger.info(
      { leaveRequestId, userId: user.id, companyId: user.companyId },
      'rejectLeaveRequest:start',
    );

    const leaveRequest = await this.findOneById(leaveRequestId, user.companyId);

    if (leaveRequest.status !== 'pending') {
      this.logger.warn(
        { leaveRequestId, status: leaveRequest.status },
        'rejectLeaveRequest:invalid-status',
      );
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

      if (!currentApprover) {
        this.logger.error(
          { leaveRequestId },
          'rejectLeaveRequest:no-pending-approver',
        );
        throw new BadRequestException('No pending approver found.');
      }

      if (currentApprover.approverId !== user.id) {
        this.logger.warn(
          {
            leaveRequestId,
            expected: currentApprover.approverId,
            actual: user.id,
          },
          'rejectLeaveRequest:wrong-approver',
        );
        throw new BadRequestException(
          'You are not authorized to reject this request.',
        );
      }

      currentApprover.status = 'rejected';
      currentApprover.actionedAt = new Date().toISOString();
    } else {
      if (leaveRequest.approverId !== user.id) {
        this.logger.warn(
          {
            leaveRequestId,
            approverId: leaveRequest.approverId,
            userId: user.id,
          },
          'rejectLeaveRequest:unauthorized',
        );
        throw new BadRequestException(
          'You are not authorized to reject this request.',
        );
      }
    }

    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        approvalChain: leaveRequest.approvalChain,
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
      updated.companyId,
      updated.employeeId,
      `Your leave request has been rejected!`,
      'leave',
    );

    await this.burstDetail(user.companyId, leaveRequestId);

    this.logger.info(
      { leaveRequestId, status: 'rejected' },
      'rejectLeaveRequest:done',
    );
    return updated;
  }
}
