import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAssetsRequestDto } from './dto/create-assets-request.dto';
import { UpdateAssetsRequestDto } from './dto/update-assets-request.dto';
import { User } from 'src/common/types/user.type';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { assetRequests } from '../schema/asset-requests.schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  approvalSteps,
  approvalWorkflows,
  companies,
  employees,
  users,
} from 'src/drizzle/schema';
import { assetApprovals } from '../schema/asset-approval.schema';
import { AssetsSettingsService } from '../settings/assets-settings.service';
import { PusherService } from 'src/modules/notification/services/pusher.service';
import { CacheService } from 'src/common/cache/cache.service';
import { PushNotificationService } from 'src/modules/notification/services/push-notification.service';
import { AssetNotificationService } from 'src/modules/notification/services/asset-notification.service';

@Injectable()
export class AssetsRequestService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly assetsSettingsService: AssetsSettingsService,
    private readonly pusher: PusherService,
    private readonly cache: CacheService,
    private readonly push: PushNotificationService,
    private readonly assetNotificationService: AssetNotificationService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:assets`,
      `company:${companyId}:assets:requests`,
    ];
  }

  async handleAssetApprovalFlow(assetRequestId: string, user: User) {
    const assetSettings = await this.assetsSettingsService.getAssetSettings(
      user.companyId,
    );
    const multi = assetSettings.multiLevelApproval;
    const chain = assetSettings.approverChain || [];

    let [workflow] = await this.db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.companyId, user.companyId),
          eq(approvalWorkflows.entityId, assetRequestId),
        ),
      )
      .execute();

    if (!workflow) {
      [workflow] = await this.db
        .insert(approvalWorkflows)
        .values({
          name: 'Asset Request Approval',
          companyId: user.companyId,
          entityId: assetRequestId,
          entityDate: new Date().toDateString(),
          createdAt: new Date(),
        })
        .returning()
        .execute();
    }

    const workflowId = workflow.id;

    const existingSteps = await this.db
      .select()
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, workflowId))
      .execute();

    if (existingSteps.length === 0) {
      const steps = multi
        ? chain.reverse().map((role: any, idx: number) => ({
            workflowId,
            sequence: idx + 1,
            role,
            minApprovals: 1,
            maxApprovals: 1,
            createdAt: new Date(),
          }))
        : [
            {
              workflowId,
              sequence: 1,
              role: 'it_manager',
              status: 'approved',
              minApprovals: 1,
              maxApprovals: 1,
              createdAt: new Date(),
            },
          ];

      const createdSteps = await this.db
        .insert(approvalSteps)
        .values(steps)
        .returning({ id: approvalSteps.id })
        .execute();

      await this.db
        .insert(assetApprovals)
        .values({
          assetRequestId,
          stepId: createdSteps[0].id,
          actorId: user.id,
          action: multi ? 'pending' : 'approved',
          remarks: multi ? 'Pending approval' : 'Auto-approved',
          createdAt: new Date(),
        })
        .execute();
    }

    if (!multi) {
      const [step] = await this.db
        .select()
        .from(approvalSteps)
        .where(
          and(
            eq(approvalSteps.workflowId, workflowId),
            eq(approvalSteps.sequence, 1),
          ),
        )
        .execute();

      const [updated] = await this.db
        .update(assetRequests)
        .set({ status: 'approved' })
        .where(eq(assetRequests.id, assetRequestId))
        .returning()
        .execute();

      if (step) {
        await this.db
          .insert(assetApprovals)
          .values({
            assetRequestId,
            stepId: step.id,
            actorId: user.id,
            action: 'approved',
            remarks: 'Auto-approved',
            createdAt: new Date(),
          })
          .execute();
      }

      await this.pusher.createEmployeeNotification(
        user.companyId,
        updated.employeeId,
        `Your asset request has been auto-approved.`,
        'asset',
      );
      await this.pusher.createNotification(
        user.companyId,
        `Your asset request has been auto-approved.`,
        'asset',
      );

      // write -> invalidate
      await this.cache.bumpCompanyVersion(user.companyId);
    }
  }

  async create(dto: CreateAssetsRequestDto, user: User) {
    const [existRequest] = await this.db
      .select()
      .from(assetRequests)
      .where(
        and(
          eq(assetRequests.employeeId, dto.employeeId),
          eq(assetRequests.assetType, dto.assetType),
          eq(assetRequests.companyId, user.companyId),
        ),
      )
      .limit(1);

    if (existRequest) {
      throw new BadRequestException(
        'You already have a request pending or active.',
      );
    }

    const [newRequest] = await this.db
      .insert(assetRequests)
      .values({
        ...dto,
        companyId: user.companyId,
        status: 'requested',
        createdAt: new Date(),
      })
      .returning()
      .execute();

    await this.pusher.createNotification(
      user.companyId,
      `Asset request by ${user.firstName} ${user.lastName} for ${newRequest.assetType} has been created.`,
      'asset',
    );

    await this.handleAssetApprovalFlow(newRequest.id, user);

    // ✅ EMAIL NOTIFICATION TO LINE MANAGER (REQUESTED)
    try {
      const ctx = await this.buildAssetRequestEmailContext(newRequest, user);

      await this.assetNotificationService.sendAssetApprovalRequestEmail({
        toEmail: ctx.managerEmail,
        managerName: ctx.managerName,
        employeeName: ctx.employeeName,
        assetType: ctx.assetType,
        purpose: ctx.purpose,
        urgency: ctx.urgency,
        notes: ctx.notes ?? undefined,
        companyName: ctx.companyName,

        // optional ids/meta
        assetRequestId: newRequest.id,
        employeeId: newRequest.employeeId,
        meta: {
          source: 'asset_request_create',
        },
      });
    } catch (e) {
      // don't block request creation if email fails
      console.error('[AssetRequestsService] manager email failed', e);
    }

    await this.auditService.logAction({
      action: 'create',
      entity: 'asset_request',
      entityId: newRequest.id,
      userId: user.id,
      details: `Asset request created for ${newRequest.assetType}`,
      changes: {
        assetType: newRequest.assetType,
        purpose: newRequest.purpose,
        urgency: newRequest.urgency,
        notes: newRequest.notes,
      },
    });

    // write -> invalidate
    await this.cache.bumpCompanyVersion(user.companyId);

    return newRequest;
  }

  // CACHED
  findAll(companyId: string) {
    const urgencyOrder = sql`
      CASE
        WHEN ${assetRequests.urgency} = 'Critical' THEN 1
        WHEN ${assetRequests.urgency} = 'High' THEN 2
        WHEN ${assetRequests.urgency} = 'Normal' THEN 3
        ELSE 4
      END
    `;

    return this.cache.getOrSetVersioned(
      companyId,
      ['assets', 'requests', 'list'],
      async () => {
        return this.db
          .select({
            id: assetRequests.id,
            employeeId: assetRequests.employeeId,
            assetType: assetRequests.assetType,
            purpose: assetRequests.purpose,
            urgency: assetRequests.urgency,
            status: assetRequests.status,
            requestDate: assetRequests.requestDate,
            createdAt: assetRequests.createdAt,
            employeeName: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
            employeeEmail: employees.email,
          })
          .from(assetRequests)
          .innerJoin(employees, eq(employees.id, assetRequests.employeeId))
          .where(eq(assetRequests.companyId, companyId))
          .orderBy(urgencyOrder, desc(assetRequests.createdAt))
          .execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async findOne(id: string) {
    const [request] = await this.db
      .select()
      .from(assetRequests)
      .where(eq(assetRequests.id, id))
      .execute();

    if (!request) {
      throw new BadRequestException(`Asset request with ID ${id} not found`);
    }
    return request;
  }

  async findByEmployeeId(employeeId: string) {
    const requests = await this.db
      .select()
      .from(assetRequests)
      .where(eq(assetRequests.employeeId, employeeId))
      .orderBy(desc(assetRequests.createdAt))
      .execute();

    if (requests.length === 0) {
      return [];
    }
    return requests;
  }

  async update(
    id: string,
    updateAssetsRequestDto: UpdateAssetsRequestDto,
    user: User,
  ) {
    await this.findOne(id);

    const [updatedRequest] = await this.db
      .update(assetRequests)
      .set({
        ...updateAssetsRequestDto,
      })
      .where(eq(assetRequests.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'asset_request',
      entityId: updatedRequest.id,
      userId: user.id,
      details: `Asset request updated for ${updatedRequest.assetType}`,
      changes: {
        assetType: updatedRequest.assetType,
        purpose: updatedRequest.purpose,
        urgency: updatedRequest.urgency,
        notes: updatedRequest.notes,
      },
    });

    // write -> invalidate
    await this.cache.bumpCompanyVersion(user.companyId);

    return updatedRequest;
  }

  async checkApprovalStatus(assetRequestId: string, user?: User) {
    const [request] = await this.db
      .select({
        id: assetRequests.id,
        requestDate: assetRequests.requestDate,
        approvalStatus: assetRequests.status,
        workflowId: approvalWorkflows.id,
        companyId: assetRequests.companyId,
      })
      .from(assetRequests)
      .leftJoin(
        approvalWorkflows,
        and(
          eq(approvalWorkflows.entityId, assetRequests.id),
          eq(approvalWorkflows.companyId, assetRequests.companyId),
        ),
      )
      .where(eq(assetRequests.id, assetRequestId))
      .execute();

    if (!request) {
      throw new NotFoundException(`Asset request not found`);
    }
    if (!request.workflowId) {
      throw new BadRequestException(`Approval workflow not initialized.`);
    }

    const steps = await this.db
      .select({
        id: approvalSteps.id,
        sequence: approvalSteps.sequence,
        role: approvalSteps.role,
        minApprovals: approvalSteps.minApprovals,
        maxApprovals: approvalSteps.maxApprovals,
        createdAt: approvalSteps.createdAt,
        status: approvalSteps.status,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, request.workflowId))
      .orderBy(approvalSteps.sequence)
      .execute();

    const assetSettings = await this.assetsSettingsService.getAssetSettings(
      request.companyId,
    );

    const SUPER_ADMIN_ROLE = 'super_admin' as const;

    const fallbackRoles = Array.from(
      new Set([...(assetSettings.fallbackRoles ?? []), SUPER_ADMIN_ROLE]),
    );

    const enrichedSteps = steps.map((step) => {
      const isFallback = fallbackRoles.includes(user?.role || '');
      const isPrimary = user?.role === step.role;
      return {
        ...step,
        fallbackRoles,
        isUserEligible: isPrimary || isFallback,
        isFallback: !isPrimary && isFallback,
      };
    });

    return {
      requestDate: request.requestDate,
      approvalStatus: request.approvalStatus,
      steps: enrichedSteps,
    };
  }

  async handleAssetApprovalAction(
    assetRequestId: string,
    user: User,
    action: 'approved' | 'rejected',
    remarks?: string,
  ) {
    const [request] = await this.db
      .select({
        id: assetRequests.id,
        workflowId: approvalWorkflows.id,
        approvalStatus: assetRequests.status,
        employeeId: assetRequests.employeeId,
        companyId: assetRequests.companyId,
      })
      .from(assetRequests)
      .leftJoin(
        approvalWorkflows,
        and(
          eq(approvalWorkflows.entityId, assetRequests.id),
          eq(approvalWorkflows.companyId, user.companyId),
        ),
      )
      .where(eq(assetRequests.id, assetRequestId))
      .limit(1)
      .execute();

    if (!request) {
      throw new NotFoundException(`Asset request not found`);
    }
    if (
      request.approvalStatus === 'approved' ||
      request.approvalStatus === 'rejected'
    ) {
      throw new BadRequestException(
        `This request has already been ${request.approvalStatus}.`,
      );
    }
    if (!request.workflowId) {
      throw new BadRequestException(`Approval workflow not initialized.`);
    }

    const steps = await this.db
      .select({
        id: approvalSteps.id,
        sequence: approvalSteps.sequence,
        role: approvalSteps.role,
        status: approvalSteps.status,
      })
      .from(approvalSteps)
      .where(eq(approvalSteps.workflowId, request.workflowId))
      .orderBy(approvalSteps.sequence)
      .execute();

    const currentStep = steps.find((s) => s.status === 'pending');
    if (!currentStep) {
      throw new BadRequestException(`No pending steps left to act on.`);
    }

    const settings = await this.assetsSettingsService.getAssetSettings(
      user.companyId,
    );
    const fallbackRoles = settings.fallbackRoles || [];
    const actorRole = currentStep.role;
    const isFallback = fallbackRoles.includes(user.role);
    const isSuperAdmin = user.role === 'super_admin';
    const isActor = isSuperAdmin || user.role === actorRole || isFallback;

    if (!isActor && !isFallback) {
      throw new BadRequestException(
        `You do not have permission to take action on this step. Required: ${actorRole}`,
      );
    }

    // =========================
    // ❌ REJECTED
    // =========================
    if (action === 'rejected') {
      await this.db
        .update(approvalSteps)
        .set({ status: 'rejected' })
        .where(eq(approvalSteps.id, currentStep.id))
        .execute();

      await this.db.insert(assetApprovals).values({
        assetRequestId,
        actorId: user.id,
        action,
        remarks: remarks ?? '',
        stepId: currentStep.id,
        createdAt: new Date(),
      });

      await this.db
        .update(assetRequests)
        .set({
          status: 'rejected',
          rejectionReason: remarks ?? '',
          updatedAt: new Date(),
        })
        .where(eq(assetRequests.id, assetRequestId))
        .execute();

      await this.pusher.createEmployeeNotification(
        user.companyId,
        request.employeeId,
        `Your asset request has been ${action}`,
        'asset',
      );

      await this.pusher.createNotification(
        user.companyId,
        `Your asset request has been ${action}`,
        'asset',
      );

      await this.push.createAndSendToEmployee(request.employeeId, {
        title: 'Asset Request Update',
        body: `Your asset request has been ${action}`,
        route: '/screens/dashboard/assets/my-asset-requests',
        data: {},
        type: 'message',
      });

      // ✅ EMAIL NOTIFICATION (EMPLOYEE)
      try {
        const [fullRequest] = await this.db
          .select()
          .from(assetRequests)
          .where(eq(assetRequests.id, assetRequestId))
          .limit(1)
          .execute();

        const employee = await this.db.query.employees.findFirst({
          where: eq(employees.id, request.employeeId),
          columns: { userId: true },
        });

        if (employee?.userId && fullRequest) {
          const requesterUser = await this.db.query.users.findFirst({
            where: eq(users.id, employee.userId),
          });

          if (requesterUser?.email) {
            const ctx = await this.buildAssetRequestEmailContext(
              fullRequest,
              requesterUser,
            );

            await this.assetNotificationService.sendAssetDecisionEmail({
              toEmail: requesterUser.email,
              managerName: ctx.managerName,
              employeeName: ctx.employeeName,
              assetType: ctx.assetType,
              purpose: ctx.purpose,
              urgency: ctx.urgency,
              notes: ctx.notes ?? undefined,
              companyName: ctx.companyName,
              status: 'rejected',
              rejectionReason: remarks ?? '',
              remarks: remarks ?? '',
              assetRequestId: fullRequest.id,
              employeeId: fullRequest.employeeId,
              approverId: user.id,
            });
          }
        }
      } catch (e) {
        console.error('[AssetApproval] rejected email failed', e);
      }

      await this.cache.bumpCompanyVersion(user.companyId);
      return `Asset request rejected successfully`;
    }

    // =========================
    // ✅ FALLBACK APPROVAL
    // =========================
    if (isFallback) {
      const remainingSteps = steps.filter((s) => s.status === 'pending');

      for (const step of remainingSteps) {
        await this.db
          .update(approvalSteps)
          .set({ status: 'approved' })
          .where(eq(approvalSteps.id, step.id))
          .execute();

        await this.db.insert(assetApprovals).values({
          assetRequestId,
          actorId: user.id,
          action: 'approved',
          remarks: `[Fallback] ${remarks ?? ''}`,
          stepId: step.id,
          createdAt: new Date(),
        });
      }

      await this.db
        .update(assetRequests)
        .set({
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(assetRequests.id, assetRequestId))
        .execute();

      await this.pusher.createEmployeeNotification(
        user.companyId,
        request.employeeId,
        `Your asset request has been ${action}`,
        'asset',
      );

      await this.pusher.createNotification(
        user.companyId,
        `Your asset request has been ${action}`,
        'asset',
      );

      await this.push.createAndSendToEmployee(request.employeeId, {
        title: 'Asset Request Update',
        body: `Your asset request has been ${action}`,
        route: '/screens/dashboard/assets/my-asset-requests',
        data: {},
        type: 'message',
      });

      // ✅ EMAIL NOTIFICATION (EMPLOYEE)
      try {
        const [fullRequest] = await this.db
          .select()
          .from(assetRequests)
          .where(eq(assetRequests.id, assetRequestId))
          .limit(1)
          .execute();

        const employee = await this.db.query.employees.findFirst({
          where: eq(employees.id, request.employeeId),
          columns: { userId: true },
        });

        if (employee?.userId && fullRequest) {
          const requesterUser = await this.db.query.users.findFirst({
            where: eq(users.id, employee.userId),
          });

          if (requesterUser?.email) {
            const ctx = await this.buildAssetRequestEmailContext(
              fullRequest,
              requesterUser,
            );

            await this.assetNotificationService.sendAssetDecisionEmail({
              toEmail: requesterUser.email,
              managerName: ctx.managerName,
              employeeName: ctx.employeeName,
              assetType: ctx.assetType,
              purpose: ctx.purpose,
              urgency: ctx.urgency,
              notes: ctx.notes ?? undefined,
              companyName: ctx.companyName,
              status: 'approved',
              remarks: `[Fallback] ${remarks ?? ''}`,
              assetRequestId: fullRequest.id,
              employeeId: fullRequest.employeeId,
              approverId: user.id,
            });
          }
        }
      } catch (e) {
        console.error('[AssetApproval] fallback email failed', e);
      }

      await this.cache.bumpCompanyVersion(user.companyId);
      return `Asset request fully approved via fallback`;
    }

    // =========================
    // ✅ NORMAL APPROVAL
    // =========================
    await this.db
      .update(approvalSteps)
      .set({ status: 'approved' })
      .where(eq(approvalSteps.id, currentStep.id))
      .execute();

    await this.db.insert(assetApprovals).values({
      assetRequestId,
      actorId: user.id,
      action,
      remarks: remarks ?? '',
      stepId: currentStep.id,
      createdAt: new Date(),
    });

    const allApproved = steps.every(
      (s) => s.id === currentStep.id || s.status === 'approved',
    );

    if (allApproved) {
      await this.db
        .update(assetRequests)
        .set({
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(assetRequests.id, assetRequestId))
        .execute();

      // ✅ EMAIL NOTIFICATION (FINAL APPROVED)
      try {
        const [fullRequest] = await this.db
          .select()
          .from(assetRequests)
          .where(eq(assetRequests.id, assetRequestId))
          .limit(1)
          .execute();

        const employee = await this.db.query.employees.findFirst({
          where: eq(employees.id, request.employeeId),
          columns: { userId: true },
        });

        if (employee?.userId && fullRequest) {
          const requesterUser = await this.db.query.users.findFirst({
            where: eq(users.id, employee.userId),
          });

          if (requesterUser?.email) {
            const ctx = await this.buildAssetRequestEmailContext(
              fullRequest,
              requesterUser,
            );

            await this.assetNotificationService.sendAssetDecisionEmail({
              toEmail: requesterUser.email,
              managerName: ctx.managerName,
              employeeName: ctx.employeeName,
              assetType: ctx.assetType,
              purpose: ctx.purpose,
              urgency: ctx.urgency,
              notes: ctx.notes ?? undefined,
              companyName: ctx.companyName,
              status: 'approved',
              remarks: remarks ?? '',
              assetRequestId: fullRequest.id,
              employeeId: fullRequest.employeeId,
              approverId: user.id,
            });
          }
        }
      } catch (e) {
        console.error('[AssetApproval] approved email failed', e);
      }
    }

    await this.pusher.createEmployeeNotification(
      user.companyId,
      request.employeeId,
      `Your asset request has been ${action}`,
      'asset',
    );

    await this.pusher.createNotification(
      user.companyId,
      `Your asset request has been ${action}`,
      'asset',
    );

    await this.push.createAndSendToEmployee(request.employeeId, {
      title: 'Asset Request Update',
      body: `Your asset request has been ${action}`,
      route: '/screens/dashboard/assets/my-asset-requests',
      data: {},
      type: 'message',
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return `Asset request ${action} successfully`;
  }

  private async buildAssetRequestEmailContext(
    assetRequest: typeof assetRequests.$inferSelect,
    requester: User | any,
  ) {
    // 1️⃣ Get requester employee record
    const employee = await this.db.query.employees.findFirst({
      where: eq(employees.userId, requester.id),
      columns: {
        id: true,
        managerId: true,
      },
    });

    if (!employee?.managerId) {
      throw new BadRequestException('Line manager not assigned to employee.');
    }

    // 2️⃣ Get manager employee record
    const managerEmployee = await this.db.query.employees.findFirst({
      where: eq(employees.id, employee.managerId),
      columns: {
        userId: true,
      },
    });

    if (!managerEmployee?.userId) {
      throw new BadRequestException('Manager user record not found.');
    }

    // 3️⃣ Get manager user details
    const managerUser = await this.db.query.users.findFirst({
      where: eq(users.id, managerEmployee.userId),
      columns: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!managerUser) {
      throw new BadRequestException('Manager user not found.');
    }

    // 4️⃣ Get company details
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, requester.companyId),
      columns: {
        name: true,
      },
    });

    return {
      // Recipient
      managerEmail: managerUser.email,
      managerName: `${managerUser.firstName} ${managerUser.lastName}`,

      // Requester
      employeeName: `${requester.firstName} ${requester.lastName}`,

      // Asset details
      assetType: assetRequest.assetType,
      purpose: assetRequest.purpose,
      urgency: assetRequest.urgency,
      notes: assetRequest.notes || null,

      // Branding
      companyName: company?.name ?? 'CentaHR',
    };
  }
}
