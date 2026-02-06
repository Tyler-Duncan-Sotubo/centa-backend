import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq, and, desc, lt, sql, inArray, or, lte, gte } from 'drizzle-orm';
import { performanceGoals } from './schema/performance-goals.schema';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { performanceGoalUpdates } from './schema/performance-goal-updates.schema';
import { goalAttachments } from './schema/goal-attachments.schema';
import { goalComments } from './schema/goal-comments.schema';
import {
  companyLocations,
  departments,
  employees,
  groupMemberships,
  jobRoles,
  performanceCycles,
  users,
} from 'src/drizzle/schema';
import { alias } from 'drizzle-orm/pg-core';
import { PolicyService } from './goal-policy.service';
import { GoalNotificationService } from 'src/modules/notification/services/goal-notification.service';

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly policy: PolicyService,
    private readonly goalNotification: GoalNotificationService,
  ) {}

  isHrOrAdmin = (user: User) =>
    ['super_admin', 'admin', 'hr_admin'].includes((user as any).role);

  async getEmployeeById(tx: db, companyId: string, employeeId: string) {
    const [emp] = await tx
      .select({
        id: employees.id,
        userId: employees.userId,
        managerId: employees.managerId,
        companyId: employees.companyId,
      })
      .from(employees)
      .where(
        and(eq(employees.id, employeeId), eq(employees.companyId, companyId)),
      )
      .limit(1);

    return emp;
  }

  async create(dto: CreateGoalDto, user: User) {
    const {
      title,
      description,
      startDate,
      dueDate,
      weight,
      employeeId,
      groupId,
      status, // DO NOT trust for ESS users
    } = dto;

    if (!startDate) throw new BadRequestException('startDate is required.');
    if (!!employeeId === !!groupId) {
      throw new BadRequestException(
        'Provide exactly one owner: employeeId OR groupId.',
      );
    }

    // Normalize to YYYY-MM-DD for date columns/comparisons
    const normDate = (d: string | Date) =>
      typeof d === 'string' ? d : d.toISOString().slice(0, 10);

    const startDateStr = normDate(startDate);
    const dueDateStr = normDate(dueDate);
    const now = new Date();

    const isPrivileged = () => {
      const role = (user as any).role ?? (user as any).userRole ?? null;
      return ['super_admin', 'admin', 'hr_admin', 'hr_manager'].includes(role);
    };

    return this.db.transaction(async (tx) => {
      // 1) Find performance cycle that covers startDate
      const [cycle] = await tx
        .select({ id: performanceCycles.id })
        .from(performanceCycles)
        .where(
          and(
            eq(performanceCycles.companyId, user.companyId),
            lte(performanceCycles.startDate, startDateStr),
            gte(performanceCycles.endDate, startDateStr),
          ),
        )
        .limit(1);

      if (!cycle) {
        throw new BadRequestException(
          'No performance cycle covers the provided startDate.',
        );
      }

      // 2) Resolve assigner display name (single query)
      const [assigner] = await tx
        .select({
          id: users.id,
          fullName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      const assignedByName = assigner?.fullName ?? `${user.id}`;

      // 3) Resolve creator's employee record (ESS guardrails)
      const [creatorEmployee] = await tx
        .select({
          id: employees.id,
          userId: employees.userId,
          companyId: employees.companyId,
        })
        .from(employees)
        .where(
          and(
            eq(employees.userId, user.id),
            eq(employees.companyId, user.companyId),
          ),
        )
        .limit(1);

      const creatorIsPrivileged = isPrivileged();
      const creatorIsEmployee = !!creatorEmployee;

      // 4) Determine target employees (avoid extra work for single employee)
      let targetEmployeeIds: string[] = [];

      if (employeeId) {
        targetEmployeeIds = [employeeId];
      } else {
        const members = await tx
          .select({ employeeId: groupMemberships.employeeId })
          .from(groupMemberships)
          .where(eq(groupMemberships.groupId, groupId!));

        const uniqueEmployeeIds = [
          ...new Set(members.map((m) => m.employeeId)),
        ];

        if (uniqueEmployeeIds.length === 0) {
          throw new BadRequestException('Selected group has no members.');
        }
        targetEmployeeIds = uniqueEmployeeIds;
      }

      // 5) ESS guardrails: employee can only create for self (and not for group)
      if (!creatorIsPrivileged && creatorIsEmployee) {
        if (groupId) {
          throw new BadRequestException('You cannot create goals for a group.');
        }
        const selfId = creatorEmployee!.id;
        if (targetEmployeeIds.length !== 1 || targetEmployeeIds[0] !== selfId) {
          throw new BadRequestException(
            'You can only create goals for yourself.',
          );
        }
      }

      // 6) Fetch target employee info (email/firstName/company + managerId for approval path)
      //    Single query for all target employees.
      const employeesInfo = await tx
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          companyId: employees.companyId,
          managerId: employees.managerId,
          userId: employees.userId,
        })
        .from(employees)
        .where(inArray(employees.id, targetEmployeeIds));

      // Ensure all found
      const foundIds = new Set(employeesInfo.map((e) => e.id));
      const missing = targetEmployeeIds.filter((id) => !foundIds.has(id));
      if (missing.length) {
        throw new NotFoundException(
          `Some employees not found: ${missing.join(', ')}`,
        );
      }

      // Ensure same company
      const outsideCompany = employeesInfo.filter(
        (e) => e.companyId !== user.companyId,
      );
      if (outsideCompany.length) {
        throw new BadRequestException(
          'One or more employees are outside your company.',
        );
      }

      // 7) Status rules (do NOT trust dto.status for ESS)
      const computedStatus = creatorIsPrivileged
        ? (status ?? 'draft')
        : 'pending_approval';

      // 8) Insert goals (one per employee)
      const goalsToInsert: (typeof performanceGoals.$inferInsert)[] =
        employeesInfo.map((emp) => ({
          title,
          description: description ?? null,
          startDate: startDateStr,
          dueDate: dueDateStr,
          companyId: user.companyId,
          cycleId: cycle.id,
          assignedAt: now,
          assignedBy: user.id,
          weight: weight ?? 0,
          status: computedStatus,
          employeeId: emp.id,
          employeeGroupId: groupId ?? null,
        }));

      const created = await tx
        .insert(performanceGoals)
        .values(goalsToInsert)
        .returning({
          id: performanceGoals.id,
          employeeId: performanceGoals.employeeId,
          status: performanceGoals.status,
        });

      // 9) Create check-in schedule for each goal (parallel)
      await Promise.all(
        created.map((g) =>
          this.policy.upsertGoalScheduleFromPolicy(
            g.id,
            user.companyId,
            tx as db,
          ),
        ),
      );

      // 10) Audit
      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_goal',
        entityId: created[0]?.id ?? null,
        userId: user.id,
        details:
          targetEmployeeIds.length === 1
            ? `Created goal "${title}" for 1 employee`
            : `Created goal "${title}" for ${targetEmployeeIds.length} group member(s)`,
        changes: {
          startDate: startDateStr,
          dueDate: dueDateStr,
          cycleId: cycle.id,
          weight: weight ?? 0,
          status: computedStatus,
          ownerType: employeeId ? 'employee' : 'group',
          count: targetEmployeeIds.length,
          creatorIsPrivileged,
        },
      });

      /**
       * 11) Notifications
       *
       * - If computedStatus !== 'pending_approval' -> email assignees
       * - If computedStatus === 'pending_approval' -> email manager for approval
       *
       * Note:
       * - ESS users cannot create group goals (guardrail above), so pending_approval implies single employee.
       */
      const goalIdByEmployee = new Map(
        created.map((g) => [g.employeeId, g.id]),
      );

      if (computedStatus !== 'pending_approval') {
        // Send to assignees (O(n))
        await Promise.all(
          employeesInfo.map((emp) =>
            this.goalNotification.sendGoalAssignment({
              toEmail: emp.email,
              subject: `New Goal Assigned: ${title}`,
              assignedBy: assignedByName,
              assignedTo: emp.firstName ?? '',
              title,
              dueDate: dueDateStr,
              description: description ?? '',
              progress: computedStatus, // if you want progress label separate, change this field
              meta: { goalId: goalIdByEmployee.get(emp.id) ?? null },
            }),
          ),
        );
        return created;
      }

      // pending_approval path (single employee)
      const emp = employeesInfo[0];
      const goalId = goalIdByEmployee.get(emp.id) ?? null;

      if (!emp?.managerId) {
        // Choose your desired behavior:
        // - throw, or
        // - skip email, or
        // - fallback to HR/admin mailbox
        throw new BadRequestException(
          'Cannot request approval: this employee has no manager assigned.',
        );
      }

      // Fetch manager email in one join (still inside txn)
      const [manager] = await tx
        .select({
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(employees)
        .innerJoin(users, eq(users.id, employees.userId))
        .where(eq(employees.id, emp.managerId))
        .limit(1);

      if (!manager?.email) {
        throw new BadRequestException(
          'Cannot request approval: manager does not have an email address.',
        );
      }

      const employeeFullName =
        `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();

      await this.goalNotification.sendGoalApprovalRequest({
        toEmail: manager.email,
        subject: `Goal approval required: ${title}`,
        employeeName: employeeFullName,
        managerName: manager.firstName ?? '',
        title,
        dueDate: dueDateStr,
        description: description ?? '',
        meta: { goalId },
      });

      return created;
    });
  }

  async findAll(companyId: string, status?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const conditions: any[] = [eq(performanceGoals.companyId, companyId)];

    // Status handling
    if (status === 'archived') {
      conditions.push(eq(performanceGoals.isArchived, true));
    } else {
      conditions.push(eq(performanceGoals.isArchived, false));

      switch (status) {
        case 'draft':
          conditions.push(eq(performanceGoals.status, 'draft'));
          break;
        case 'incomplete':
          conditions.push(eq(performanceGoals.status, 'incomplete'));
          break;
        case 'completed':
          conditions.push(eq(performanceGoals.status, 'completed'));
          break;
        case 'overdue':
          conditions.push(
            eq(performanceGoals.status, 'incomplete'),
            lt(performanceGoals.dueDate, today),
          );
          break;
      }
    }

    const goals = await this.db
      .select({
        id: performanceGoals.id,
        title: performanceGoals.title,
        description: performanceGoals.description,
        parentGoalId: performanceGoals.parentGoalId,
        dueDate: performanceGoals.dueDate,
        startDate: performanceGoals.startDate,
        cycleId: performanceGoals.cycleId,
        weight: performanceGoals.weight,
        status: performanceGoals.status,
        isArchived: performanceGoals.isArchived,
        employee: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        employeeId: employees.id,
        departmentName: departments.name,
        departmentId: departments.id,
        jobRoleName: jobRoles.title,
      })
      .from(performanceGoals)
      .innerJoin(employees, eq(employees.id, performanceGoals.employeeId))
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(and(...conditions))
      .orderBy(desc(performanceGoals.assignedAt))
      .execute();

    const latestProgress = await this.db
      .select({
        goalId: performanceGoalUpdates.goalId,
        progress: performanceGoalUpdates.progress,
      })
      .from(performanceGoalUpdates)
      .where(
        inArray(
          performanceGoalUpdates.goalId,
          goals.map((g) => g.id),
        ),
      )
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .execute();

    // Reduce to map of goalId => progress
    const progressMap = new Map<string, number>();
    for (const update of latestProgress) {
      if (!progressMap.has(update.goalId)) {
        progressMap.set(update.goalId, update.progress);
      }
    }

    const enrichedGoals = goals.map((goal) => ({
      ...goal,
      progress: progressMap.get(goal.id) ?? 0,
    }));

    return enrichedGoals;
  }

  async findAllByEmployeeId(
    companyId: string,
    employeeId: string,
    status?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const conditions: any[] = [
      eq(performanceGoals.companyId, companyId),
      eq(performanceGoals.employeeId, employeeId),
    ];

    // Status handling
    if (status === 'archived') {
      conditions.push(eq(performanceGoals.isArchived, true));
    } else {
      conditions.push(eq(performanceGoals.isArchived, false));

      switch (status) {
        case 'draft':
          conditions.push(eq(performanceGoals.status, 'draft'));
          break;
        case 'incomplete':
          conditions.push(eq(performanceGoals.status, 'incomplete'));
          break;
        case 'completed':
          conditions.push(eq(performanceGoals.status, 'completed'));
          break;
        case 'overdue':
          conditions.push(
            eq(performanceGoals.status, 'incomplete'),
            lt(performanceGoals.dueDate, today),
          );
          break;
      }
    }

    const goals = await this.db
      .select({
        id: performanceGoals.id,
        title: performanceGoals.title,
        description: performanceGoals.description,
        parentGoalId: performanceGoals.parentGoalId,
        dueDate: performanceGoals.dueDate,
        startDate: performanceGoals.startDate,
        cycleId: performanceGoals.cycleId,
        weight: performanceGoals.weight,
        status: performanceGoals.status,
        isArchived: performanceGoals.isArchived,
        employee: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        employeeId: employees.id,
        departmentName: departments.name,
        departmentId: departments.id,
        jobRoleName: jobRoles.title,
      })
      .from(performanceGoals)
      .innerJoin(employees, eq(employees.id, performanceGoals.employeeId))
      .leftJoin(jobRoles, eq(jobRoles.id, employees.jobRoleId))
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(and(...conditions))
      .orderBy(desc(performanceGoals.assignedAt))
      .execute();

    const latestProgress = await this.db
      .select({
        goalId: performanceGoalUpdates.goalId,
        progress: performanceGoalUpdates.progress,
      })
      .from(performanceGoalUpdates)
      .where(
        inArray(
          performanceGoalUpdates.goalId,
          goals.map((g) => g.id),
        ),
      )
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .execute();

    // Reduce to map of goalId => progress
    const progressMap = new Map<string, number>();
    for (const update of latestProgress) {
      if (!progressMap.has(update.goalId)) {
        progressMap.set(update.goalId, update.progress);
      }
    }

    const enrichedGoals = goals.map((goal) => ({
      ...goal,
      progress: progressMap.get(goal.id) ?? 0,
    }));

    return enrichedGoals;
  }

  async findOne(id: string, companyId: string) {
    const managerEmployee = alias(employees, 'manager_employee');
    const managerUser = alias(users, 'manager_user');
    const employeeUser = alias(users, 'employee_user');

    const [goal] = await this.db
      .select({
        id: performanceGoals.id,
        title: performanceGoals.title,
        description: performanceGoals.description,
        dueDate: performanceGoals.dueDate,
        startDate: performanceGoals.startDate,
        cycleId: performanceGoals.cycleId,
        cycleName: performanceCycles.name,
        weight: performanceGoals.weight,
        status: performanceGoals.status,
        isArchived: performanceGoals.isArchived,
        avatarUrl: users.avatar,
        employee: sql<string>`CONCAT(${employeeUser.firstName}, ' ', ${employeeUser.lastName})`,
        employeeId: employees.id,
        departmentName: departments.name,
        departmentId: departments.id,
        office: companyLocations.name,

        manager: sql<string>`COALESCE(CONCAT(${managerUser.firstName}, ' ', ${managerUser.lastName}), 'Super Admin')`,
      })
      .from(performanceGoals)
      .innerJoin(employees, eq(employees.id, performanceGoals.employeeId)) // employee
      .innerJoin(employeeUser, eq(employeeUser.id, employees.userId)) // employee → user
      .innerJoin(users, eq(users.id, employees.userId)) // assigned by user
      .leftJoin(
        managerEmployee as any,
        eq(managerEmployee.id, employees.managerId),
      )
      .leftJoin(managerUser as any, eq(managerUser.id, managerEmployee.userId))
      .innerJoin(
        performanceCycles,
        eq(performanceCycles.id, performanceGoals.cycleId),
      )
      .innerJoin(
        companyLocations,
        eq(companyLocations.id, employees.locationId),
      )
      .leftJoin(departments, eq(departments.id, employees.departmentId))
      .where(
        and(
          eq(performanceGoals.id, id),
          eq(performanceGoals.companyId, companyId),
        ),
      );

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    const [updates, comments, attachments] = await Promise.all([
      this.db
        .select({
          id: performanceGoalUpdates.id,
          progress: performanceGoalUpdates.progress,
          note: performanceGoalUpdates.note,
          createdAt: performanceGoalUpdates.createdAt,
          createdBy: performanceGoalUpdates.createdBy,
          createdByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        })
        .from(performanceGoalUpdates)
        .innerJoin(users, eq(users.id, performanceGoalUpdates.createdBy))
        .where(eq(performanceGoalUpdates.goalId, id))
        .orderBy(desc(performanceGoalUpdates.createdAt)),

      this.db
        .select({
          id: goalComments.id,
          comment: goalComments.comment,
          createdAt: goalComments.createdAt,
          createdBy: goalComments.authorId,
          createdByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        })
        .from(goalComments)
        .innerJoin(users, eq(users.id, goalComments.authorId))
        .where(eq(goalComments.goalId, id)),

      this.db
        .select({
          id: goalAttachments.id,
          fileName: goalAttachments.fileName,
          createdAt: goalAttachments.createdAt,
          uploadedBy: goalAttachments.uploadedById,
          uploadedByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          fileUrl: goalAttachments.fileUrl,
          comment: goalAttachments.comment,
        })
        .from(goalAttachments)
        .innerJoin(users, eq(users.id, goalAttachments.uploadedById))
        .where(eq(goalAttachments.goalId, id)),
    ]);

    return {
      ...goal,
      updates,
      comments,
      attachments,
    };
  }

  async getStatusCountForEmployee(companyId: string, employeeId: string) {
    const rows = await this.db
      .select({
        status: performanceGoals.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.employeeId, employeeId),
        ),
      )
      .groupBy(performanceGoals.status);

    // Normalize with zeros for any missing statuses your UI expects
    const counts = {
      published: 0,
      incomplete: 0,
      completed: 0,
      overdue: 0,
      archived: 0,
    } as Record<string, number>;

    for (const r of rows)
      counts[r.status as keyof typeof counts] = r.count ?? 0;

    return counts;
  }

  async getStatusCount(companyId: string) {
    const rows = await this.db
      .select({
        status: performanceGoals.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(performanceGoals)
      .where(eq(performanceGoals.companyId, companyId))
      .groupBy(performanceGoals.status);

    // Normalize with zeros for any missing statuses your UI expects
    const counts = {
      published: 0,
      incomplete: 0,
      completed: 0,
      overdue: 0,
      archived: 0,
    } as Record<string, number>;

    for (const r of rows)
      counts[r.status as keyof typeof counts] = r.count ?? 0;

    return counts;
  }

  async update(id: string, dto: UpdateGoalDto, user: User) {
    const [existing] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, id),
          eq(performanceGoals.companyId, user.companyId),
        ),
      );

    if (!existing) {
      throw new NotFoundException(
        'Goal not found or not assigned to this user',
      );
    }

    // Fetch the most recent progress update
    const [latestUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, id))
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1);

    const latestProgress = latestUpdate?.progress ?? 0;

    if (latestProgress >= 100) {
      throw new BadRequestException('Cannot update a completed goal');
    }

    const [updated] = await this.db
      .update(performanceGoals)
      .set({
        ...dto,
        assignedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(performanceGoals.id, id))
      .returning();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_goal',
      entityId: id,
      userId: user.id,
      details: `Updated performance goal: ${updated.title}`,
      changes: dto,
    });

    return updated;
  }

  async remove(id: string, user: User) {
    const role = (user as any).role ?? (user as any).userRole ?? null;

    console.log('Attempting to archive goal', { id, userId: user.id, role });

    // Only privileged roles can archive/delete goals
    const canArchive = [
      'super_admin',
      'admin',
      'hr_admin',
      'hr_manager',
    ].includes(role);

    if (!canArchive) {
      throw new BadRequestException('You are not allowed to delete goals.');
    }

    const [existing] = await this.db
      .select({
        id: performanceGoals.id,
        title: performanceGoals.title,
        isArchived: performanceGoals.isArchived,
        companyId: performanceGoals.companyId,
      })
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, id),
          eq(performanceGoals.companyId, user.companyId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Goal not found');
    }

    if (existing.isArchived) {
      return { message: 'Goal is already archived' };
    }

    await this.db
      .update(performanceGoals)
      .set({
        isArchived: true,
        updatedAt: new Date(),
        assignedBy: user.id,
        status: 'archived',
      })
      .where(eq(performanceGoals.id, id))
      .execute();

    await this.auditService.logAction({
      action: 'archive',
      entity: 'performance_goal',
      entityId: id,
      userId: user.id,
      details: `Archived performance goal: ${existing.title}`,
    });

    return { message: 'Goal archived successfully' };
  }

  async publishGoalAndSubGoals(goalId: string) {
    // Step 1: Find the goal
    const goal = await this.db
      .select({
        id: performanceGoals.id,
        parentGoalId: performanceGoals.parentGoalId,
      })
      .from(performanceGoals)
      .where(eq(performanceGoals.id, goalId))
      .limit(1)
      .then((res) => res[0]);

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Step 2: Determine the groupId (parent or self)
    const groupId = goal.parentGoalId || goal.id;

    // Step 3: Update all goals in the group (parent + subgoals)
    await this.db
      .update(performanceGoals)
      .set({ status: 'active', updatedAt: new Date() })
      .where(
        or(
          eq(performanceGoals.id, groupId), // parent
          eq(performanceGoals.parentGoalId, groupId), // subgoals
        ),
      );
  }

  async archiveForEmployee(goalId: string, employeeId: string, user: User) {
    // 1) Ensure the employee exists and belongs to the same company
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.companyId, user.companyId),
        ),
      );

    if (!employee) {
      throw new NotFoundException('Employee not found in company');
    }

    // 2) Ensure the goal exists and is assigned to this user
    const [existingGoal] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.employeeId, employeeId),
          eq(performanceGoals.companyId, user.companyId),
        ),
      );

    if (!existingGoal) {
      throw new NotFoundException(
        'Goal not found or not assigned to this employee',
      );
    }

    if (existingGoal.isArchived) {
      throw new BadRequestException('Goal is already archived');
    }

    // 3) Check for activity (updates, comments, attachments)
    const [{ updatesCount }] = await this.db
      .select({ updatesCount: sql<number>`COUNT(*)::int` })
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, goalId));

    const [{ commentsCount }] = await this.db
      .select({ commentsCount: sql<number>`COUNT(*)::int` })
      .from(goalComments)
      .where(eq(goalComments.goalId, goalId));

    const [{ attachmentsCount }] = await this.db
      .select({ attachmentsCount: sql<number>`COUNT(*)::int` })
      .from(goalAttachments)
      .where(eq(goalAttachments.goalId, goalId));

    const hasActivity =
      (updatesCount ?? 0) > 0 ||
      (commentsCount ?? 0) > 0 ||
      (attachmentsCount ?? 0) > 0;

    if (hasActivity) {
      throw new BadRequestException('Goal has activity and cannot be deleted');
    }

    // 4) Archive the goal (no status restriction)
    await this.db
      .update(performanceGoals)
      .set({
        isArchived: true,
        status: 'archived', // keep if you want status to reflect archive
        updatedAt: new Date(),
        assignedBy: user.id,
      })
      .where(eq(performanceGoals.id, goalId))
      .execute();

    // 5) Audit log
    await this.auditService.logAction({
      action: 'archive',
      entity: 'performance_goal',
      entityId: goalId,
      userId: user.id,
      details: `Archived goal for employee ${employeeId}`,
    });

    // Return a hint your delete endpoint can use
    return {
      message: 'Goal archived for employee',
      activity: { updatesCount, commentsCount, attachmentsCount },
      deletable: !hasActivity,
    };
  }

  async approveGoal(goalId: string, user: User) {
    const role = (user as any).role ?? (user as any).userRole ?? null;
    const isPrivileged = [
      'super_admin',
      'admin',
      'hr_admin',
      'hr_manager',
    ].includes(role);

    return await this.db.transaction(async (tx) => {
      const [goal] = await tx
        .select({
          id: performanceGoals.id,
          status: performanceGoals.status,
          employeeId: performanceGoals.employeeId, // currently typed string | null
        })
        .from(performanceGoals)
        .where(
          and(
            eq(performanceGoals.id, goalId),
            eq(performanceGoals.companyId, user.companyId),
          ),
        )
        .limit(1);

      if (!goal) throw new NotFoundException('Goal not found');
      if (!goal.employeeId)
        throw new BadRequestException('Goal has no employee owner');

      // If not HR/admin, validate that user is the employee’s manager
      if (!isPrivileged) {
        const [managerEmp] = await tx
          .select({
            id: employees.id,
          })
          .from(employees)
          .where(
            and(
              eq(employees.userId, user.id),
              eq(employees.companyId, user.companyId),
            ),
          )
          .limit(1);

        if (!managerEmp) {
          throw new BadRequestException('Manager employee record not found.');
        }

        // 2) Resolve goal owner's employee record
        const [targetEmp] = await tx
          .select({
            id: employees.id,
            managerId: employees.managerId,
          })
          .from(employees)
          .where(
            and(
              eq(employees.id, goal.employeeId),
              eq(employees.companyId, user.companyId),
            ),
          )
          .limit(1);

        if (!targetEmp) {
          throw new NotFoundException('Target employee not found.');
        }

        // 3) Enforce reporting relationship
        if (targetEmp.managerId !== managerEmp.id) {
          throw new BadRequestException(
            'You are not allowed to approve goals for this employee.',
          );
        }
      }

      const [updated] = await tx
        .update(performanceGoals)
        .set({
          status: 'active', // or 'published' depending on your model
          assignedBy: user.id,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(performanceGoals.id, goalId))
        .returning({
          id: performanceGoals.id,
          status: performanceGoals.status,
          employeeId: performanceGoals.employeeId,
        });

      await this.auditService.logAction({
        action: 'approve',
        entity: 'performance_goal',
        entityId: goalId,
        userId: user.id,
        details: `Approved goal`,
        changes: { status: 'active' },
      });

      // Optional: notify employee "Goal approved"
      // await this.goalNotification.sendGoalApproved(...)

      return updated;
    });
  }

  async rejectGoal(goalId: string, reason: string, user: User) {
    if (!reason?.trim()) throw new BadRequestException('Reason is required.');

    return await this.db.transaction(async (tx) => {
      const [goal] = await tx
        .select({
          id: performanceGoals.id,
          status: performanceGoals.status,
          employeeId: performanceGoals.employeeId,
          isArchived: performanceGoals.isArchived,
        })
        .from(performanceGoals)
        .where(
          and(
            eq(performanceGoals.id, goalId),
            eq(performanceGoals.companyId, user.companyId),
          ),
        )
        .limit(1);

      if (!goal || goal.isArchived)
        throw new NotFoundException('Goal not found.');
      if (goal.status !== 'pending_approval') {
        throw new BadRequestException(
          'Only pending approval goals can be rejected.',
        );
      }

      // Store reason as a comment (or an update row)
      await tx.insert(goalComments).values({
        goalId,
        comment: `Rejected: ${reason}`,
        authorId: user.id,
        createdAt: new Date(),
      } as any);

      const [updated] = await tx
        .update(performanceGoals)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(performanceGoals.id, goalId))
        .returning({
          id: performanceGoals.id,
          status: performanceGoals.status,
        });

      await this.auditService.logAction({
        action: 'reject',
        entity: 'performance_goal',
        entityId: goalId,
        userId: user.id,
        details: `Rejected goal`,
        changes: { status: 'draft', reason },
      });

      return updated;
    });
  }
}
