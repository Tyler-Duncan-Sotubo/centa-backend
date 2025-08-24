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
import {
  eq,
  and,
  desc,
  lt,
  sql,
  isNotNull,
  inArray,
  or,
  lte,
  gte,
} from 'drizzle-orm';
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

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async create(dto: CreateGoalDto, user: User) {
    const {
      title,
      description,
      startDate,
      dueDate,
      weight,
      employeeId,
      groupId,
      status,
    } = dto;

    if (!startDate) throw new Error('startDate is required.');
    if (!!employeeId === !!groupId) {
      throw new Error('Provide exactly one owner: employeeId OR groupId.');
    }

    // Normalize to YYYY-MM-DD for date columns/comparisons
    const normDate = (d: string | Date) =>
      typeof d === 'string' ? d : d.toISOString().slice(0, 10);

    const startDateStr = normDate(startDate);
    const dueDateStr = normDate(dueDate);
    const statusVal = status ?? 'draft';
    const now = new Date();

    // Find cycle covering startDate
    const [cycle] = await this.db
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
      throw new Error('No performance cycle covers the provided startDate.');
    }

    return await this.db.transaction(async (tx) => {
      let goalsToInsert: (typeof performanceGoals.$inferInsert)[] = [];

      if (employeeId) {
        goalsToInsert = [
          {
            title,
            description: description ?? null,
            startDate: startDateStr,
            dueDate: dueDateStr,
            companyId: user.companyId,
            cycleId: cycle.id,
            assignedAt: now,
            assignedBy: user.id,
            weight: weight ?? 0,
            status: statusVal,
            employeeId,
            employeeGroupId: null,
          },
        ];
      } else {
        // Resolve members of the group
        const members = await tx
          .select({ employeeId: groupMemberships.employeeId })
          .from(groupMemberships)
          .where(eq(groupMemberships.groupId, groupId!));

        const uniqueEmployeeIds = [
          ...new Set(members.map((m) => m.employeeId)),
        ];
        if (uniqueEmployeeIds.length === 0) {
          throw new Error('Selected group has no members.');
        }

        goalsToInsert = uniqueEmployeeIds.map((empId) => ({
          title,
          description: description ?? null,
          startDate: startDateStr,
          dueDate: dueDateStr,
          companyId: user.companyId,
          cycleId: cycle.id,
          assignedAt: now,
          assignedBy: user.id,
          weight: weight ?? 0,
          status: statusVal,
          employeeId: empId,
          employeeGroupId: groupId!, // lineage
        }));
      }

      const created = await tx
        .insert(performanceGoals)
        .values(goalsToInsert)
        .returning();

      // Create a check-in schedule for EACH created goal, in the same txn
      await Promise.all(
        created.map(
          (g: typeof performanceGoals.$inferInsert & { id: string }) =>
            this.policy.upsertGoalScheduleFromPolicy(
              g.id,
              user.companyId,
              tx as db,
            ),
        ),
      );

      await this.auditService.logAction({
        action: 'create',
        entity: 'performance_goal',
        entityId: created[0]?.id ?? null,
        userId: user.id,
        details: employeeId
          ? `Created goal "${title}" for 1 employee`
          : `Created goal "${title}" for ${created.length} group member(s)`,
        changes: {
          startDate: startDateStr,
          dueDate: dueDateStr,
          cycleId: cycle.id,
          weight: weight ?? 0,
          status: statusVal,
          ownerType: employeeId ? 'employee' : 'group',
          count: created.length,
        },
      });

      // Return the array (group fan-out) or single-item array (employee)
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
      isNotNull(performanceGoals.parentGoalId), // Exclude parent goals
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
      throw new NotFoundException('Goal not found');
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
    // 1. Ensure the employee exists and belongs to the same company
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

    // 2. Ensure the goal exists and is assigned to this user
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

    if (existingGoal.status !== 'draft') {
      throw new BadRequestException('Only draft goals can be archived');
    }

    // 3. Soft archive the goal
    await this.db
      .update(performanceGoals)
      .set({
        isArchived: true,
        updatedAt: new Date(),
        assignedBy: user.id,
        status: 'archived', // optional, if you want to mark status
      })
      .where(eq(performanceGoals.id, goalId))
      .execute();

    // 4. Log the action
    await this.auditService.logAction({
      action: 'unassign',
      entity: 'performance_goal',
      entityId: goalId,
      userId: user.id,
      details: `Archived goal for employee ${employeeId}`,
    });

    return { message: 'Goal archived for employee' };
  }
}
