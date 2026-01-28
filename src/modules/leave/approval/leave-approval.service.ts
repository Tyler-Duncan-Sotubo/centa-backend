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
import { LeaveNotificationService } from 'src/modules/notification/services/leave-notification.service';
import { companies, employees } from 'src/drizzle/schema';
import { leaveTypes } from '../schema/leave-types.schema';

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
    private readonly leaveNotificationService: LeaveNotificationService,
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

    // Basic authorization checks (single-level legacy)
    // Note: In multi-level, approverId might not equal the current level approver.
    // We'll enforce proper multi-level authorization below.
    if (!isMultiLevel) {
      if (leaveRequest.approverId !== user.id && user.role !== 'super_admin') {
        throw new BadRequestException(
          'You are not authorized to approve this request',
        );
      }
    }

    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException(
        'Leave request is not in a state that can be approved',
      );
    }

    // -----------------------------
    // MULTI-LEVEL APPROVAL
    // -----------------------------
    if (isMultiLevel) {
      const approvalChain: Array<{
        approverId: string;
        status: 'pending' | 'approved' | 'rejected';
        actionedAt?: string;
      }> = Array.isArray(leaveRequest.approvalChain)
        ? leaveRequest.approvalChain
        : [];

      if (!approvalChain.length) {
        throw new BadRequestException('Approval chain is empty.');
      }

      // Find the current pending approver in chain
      const currentIndex = approvalChain.findIndex(
        (level) => level.status === 'pending',
      );

      if (currentIndex === -1) {
        throw new BadRequestException('No pending approver found.');
      }

      const currentApprover = approvalChain[currentIndex];

      // Authorization: must be the current pending approver (unless super_admin)
      if (
        currentApprover.approverId !== user.id &&
        user.role !== 'super_admin'
      ) {
        throw new BadRequestException(
          'You are not authorized to approve this request.',
        );
      }

      // Mark current level approved
      approvalChain[currentIndex] = {
        ...currentApprover,
        status: 'approved',
        actionedAt: new Date().toISOString(),
      };

      const stillPending = approvalChain.some(
        (level) => level.status === 'pending',
      );
      const newStatus: 'pending' | 'approved' = stillPending
        ? 'pending'
        : 'approved';

      // "Version/level" fields for multi-approval progress
      // - approvedLevel: how many levels approved so far
      // - totalLevels: total number of levels
      const approvedLevel = approvalChain.filter(
        (l) => l.status === 'approved',
      ).length;
      const totalLevels = approvalChain.length;

      const approvedAt = newStatus === 'approved' ? new Date() : null;

      // Persist
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

      // Apply balance only when fully approved
      if (newStatus === 'approved') {
        await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
          leaveRequest.leaveTypeId,
          leaveRequest.employeeId,
          new Date().getFullYear(),
          leaveRequest.totalDays,
          user.id,
        );
      }

      // ----------------------------------------
      // Notifications + emails
      // ----------------------------------------
      if (newStatus === 'approved') {
        // Send employee decision email ONLY when fully approved
        const ctx = await this.getLeaveEmailContext(
          leaveRequest.employeeId,
          user.companyId,
          leaveRequest.leaveTypeId,
        );

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

          // OPTIONAL: add these if your email template can show them
          // approvalProgress: `${approvedLevel}/${totalLevels}`,
        });

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
            data: {
              leaveRequestId: leaveRequest.id,
            },
            type: 'message',
          },
        );
      } else {
        // Still pending: notify the NEXT approver (optional but typical)
        const nextIndex = approvalChain.findIndex(
          (l) => l.status === 'pending',
        );
        if (nextIndex !== -1) {
          const nextApproverId = approvalChain[nextIndex].approverId;

          // Fetch next approver contact details
          const nextApprover = await this.getEmployeeContactForApproval(
            nextApproverId,
            user.companyId,
          );

          // Context for leave request (employee + company + leave type)
          const ctx = await this.getLeaveEmailContext(
            leaveRequest.employeeId, // person who requested leave
            user.companyId,
            leaveRequest.leaveTypeId,
          );

          // Email the next approver
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

          await this.pusher.createEmployeeNotification(
            user.companyId,
            nextApproverId,
            `A leave request needs your approval (${approvedLevel}/${totalLevels} approved so far).`,
            'leave',
          );

          await this.push.createAndSendToEmployee(nextApproverId, {
            title: 'Leave approval required',
            body: `A leave request needs your approval (${approvedLevel}/${totalLevels}).`,
            route: `/screens/dashboard/leave/approvals/${leaveRequestId}`,
            data: { leaveRequestId },
            type: 'message',
          });
        }
      }

      // Audit
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

      // Cache invalidation (company version bump)
      await this.cache.bumpCompanyVersion(user.companyId);

      return updatedLeaveRequest;
    }

    // -----------------------------
    // SINGLE-LEVEL APPROVAL
    // -----------------------------
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

    await this.leaveBalanceService.updateLeaveBalanceOnLeaveApproval(
      leaveRequest.leaveTypeId,
      leaveRequest.employeeId,
      new Date().getFullYear(),
      leaveRequest.totalDays,
      user.id,
    );

    const ctx = await this.getLeaveEmailContext(
      leaveRequest.employeeId,
      user.companyId,
      leaveRequest.leaveTypeId,
    );

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

    await this.pusher.createEmployeeNotification(
      updatedLeaveRequest[0].companyId,
      updatedLeaveRequest[0].employeeId,
      `Your leave request has been approved!`,
      'leave',
    );

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

      // Notifications

      const ctx = await this.getLeaveEmailContext(
        leaveRequest.employeeId,
        user.companyId,
        leaveRequest.leaveTypeId,
      );

      await this.leaveNotificationService.sendLeaveDecisionEmail({
        toEmail: ctx.employeeEmail,
        managerName: ctx.managerName,
        employeeName: ctx.employeeName,
        leaveType: ctx.leaveTypeName,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        companyName: ctx.companyName,
        status: 'rejected', // or 'rejected'
        rejectionReason: dto.rejectionReason,
        leaveRequestId: leaveRequest.id,
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

  // Put this inside your LeaveApprovalService class

  // Put this inside your LeaveApprovalService class

  private async getLeaveEmailContext(
    employeeId: string,
    companyId: string,
    leaveTypeId: string,
  ) {
    // 1) Employee
    const [employee] = await this.db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        email: employees.email,
        managerId: employees.managerId,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .execute();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // 2) Manager (also an employee)
    let managerName = 'Manager';
    let managerEmail: string | null = null;

    if (employee.managerId) {
      const [manager] = await this.db
        .select({
          firstName: employees.firstName,
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.id, employee.managerId))
        .execute();

      if (manager) {
        managerName = manager.firstName || managerName;
        managerEmail = manager.email || null;
      }
    }

    // 3) Company
    const [companyRow] = await this.db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    const companyName = companyRow?.name ?? 'CentaHR';

    // 4) Leave Type
    const [leaveType] = await this.db
      .select({
        name: leaveTypes.name,
      })
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.id, leaveTypeId),
          eq(leaveTypes.companyId, companyId),
        ),
      )
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
  private async getEmployeeContactForApproval(
    employeeId: string,
    companyId: string,
  ) {
    // Example shape. Replace `employees` + columns with your real schema.
    const [emp] = await this.db
      .select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
      })
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), eq(employees.companyId, companyId)),
      )
      .limit(1)
      .execute();

    if (!emp) {
      throw new BadRequestException('Next approver not found.');
    }

    return {
      employeeId: emp.id,
      email: emp.email,
      fullName: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
    };
  }
}
