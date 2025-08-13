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
import { eq, and, desc, lt, sql, isNotNull, inArray, or } from 'drizzle-orm';
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
  jobRoles,
  performanceCycles,
  users,
} from 'src/drizzle/schema';
import { alias } from 'drizzle-orm/pg-core';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private ttlListSeconds = 5 * 60; // 5m for lists
  private ttlItemSeconds = 5 * 60; // 5m for detail
  private tags(companyId: string) {
    return [`company:${companyId}:goals`];
  }

  async create(dto: CreateGoalDto, user: User) {
    const {
      title,
      description,
      dueDate,
      cycleId,
      startDate,
      ownerIds = [],
      weight,
    } = dto;

    // 1) Create the parent (template) goal (no owner)
    const [parentGoal] = await this.db
      .insert(performanceGoals)
      .values({
        title,
        description,
        startDate,
        dueDate,
        companyId: user.companyId,
        cycleId,
        assignedAt: new Date(),
        assignedBy: user.id,
        weight: weight ?? 0,
        status: 'draft',
      })
      .returning()
      .execute();

    // 2) Create a goal for each owner, linked to the parent
    if (ownerIds.length) {
      const goalInstances = ownerIds.map((ownerId: string) => ({
        title,
        description,
        startDate,
        dueDate,
        companyId: user.companyId,
        cycleId,
        employeeId: ownerId,
        parentGoalId: parentGoal.id,
        assignedAt: new Date(),
        assignedBy: user.id,
        weight: weight ?? 0,
        status: 'draft',
      }));
      await this.db.insert(performanceGoals).values(goalInstances).execute();
    }

    // 3) Audit
    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_goal',
      entityId: parentGoal.id,
      userId: user.id,
      details: `Created goal template: ${parentGoal.title} for ${ownerIds.length} assignees`,
      changes: { title, description, cycleId, ownerIds },
    });

    // Invalidate caches for this company
    await this.cache.bumpCompanyVersion(user.companyId);

    return parentGoal;
  }

  async findAll(companyId: string, status?: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['goals', 'list', status || 'all'],
      async () => {
        const today = new Date().toISOString().slice(0, 10);
        const conditions: any[] = [
          eq(performanceGoals.companyId, companyId),
          isNotNull(performanceGoals.parentGoalId), // exclude parents
        ];

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

        if (goals.length === 0) return [];

        const goalIds = goals.map((g) => g.id);
        const updates = await this.db
          .select({
            goalId: performanceGoalUpdates.goalId,
            progress: performanceGoalUpdates.progress,
            createdAt: performanceGoalUpdates.createdAt,
          })
          .from(performanceGoalUpdates)
          .where(inArray(performanceGoalUpdates.goalId, goalIds))
          .orderBy(desc(performanceGoalUpdates.createdAt))
          .execute();

        const progressMap = new Map<string, number>();
        for (const u of updates) {
          if (!progressMap.has(u.goalId)) progressMap.set(u.goalId, u.progress);
        }

        return goals.map((g) => ({
          ...g,
          progress: progressMap.get(g.id) ?? 0,
        }));
      },
      { ttlSeconds: this.ttlListSeconds, tags: this.tags(companyId) },
    );
  }

  async findAllByEmployeeId(
    companyId: string,
    employeeId: string,
    status?: string,
  ) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['goals', 'by-employee', employeeId, status || 'all'],
      async () => {
        const today = new Date().toISOString().slice(0, 10);
        const conditions: any[] = [
          eq(performanceGoals.companyId, companyId),
          eq(performanceGoals.employeeId, employeeId),
          isNotNull(performanceGoals.parentGoalId),
        ];

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

        if (goals.length === 0) return [];

        const updates = await this.db
          .select({
            goalId: performanceGoalUpdates.goalId,
            progress: performanceGoalUpdates.progress,
            createdAt: performanceGoalUpdates.createdAt,
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

        const progressMap = new Map<string, number>();
        for (const u of updates) {
          if (!progressMap.has(u.goalId)) progressMap.set(u.goalId, u.progress);
        }

        return goals.map((g) => ({
          ...g,
          progress: progressMap.get(g.id) ?? 0,
        }));
      },
      { ttlSeconds: this.ttlListSeconds, tags: this.tags(companyId) },
    );
  }

  async findOne(id: string, companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['goals', 'one', id],
      async () => {
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
          .innerJoin(employees, eq(employees.id, performanceGoals.employeeId))
          .innerJoin(employeeUser, eq(employeeUser.id, employees.userId))
          .innerJoin(users, eq(users.id, employees.userId))
          .leftJoin(
            managerEmployee as any,
            eq(managerEmployee.id, employees.managerId),
          )
          .leftJoin(
            managerUser as any,
            eq(managerUser.id, managerEmployee.userId),
          )
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
          )
          .execute();

        if (!goal) throw new NotFoundException('Goal not found');

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
            .orderBy(desc(performanceGoalUpdates.createdAt))
            .execute(),

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
            .where(eq(goalComments.goalId, id))
            .execute(),

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
            .where(eq(goalAttachments.goalId, id))
            .execute(),
        ]);

        return { ...goal, updates, comments, attachments };
      },
      { ttlSeconds: this.ttlItemSeconds, tags: this.tags(companyId) },
    );
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
      )
      .execute();

    if (!existing) {
      throw new NotFoundException(
        'Goal not found or not assigned to this user',
      );
    }

    // Latest progress (prevent updates on completed)
    const [latestUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, id))
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1)
      .execute();

    const latestProgress = latestUpdate?.progress ?? 0;
    if (latestProgress >= 100) {
      throw new BadRequestException('Cannot update a completed goal');
    }

    const [updated] = await this.db
      .update(performanceGoals)
      .set({ ...dto, assignedBy: user.id, updatedAt: new Date() })
      .where(eq(performanceGoals.id, id))
      .returning()
      .execute();

    await this.auditService.logAction({
      action: 'update',
      entity: 'performance_goal',
      entityId: id,
      userId: user.id,
      details: `Updated performance goal: ${updated.title}`,
      changes: dto,
    });

    await this.cache.bumpCompanyVersion(user.companyId);

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
      )
      .execute();

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

    await this.cache.bumpCompanyVersion(user.companyId);

    return { message: 'Goal archived successfully' };
  }

  async publishGoalAndSubGoals(goalId: string) {
    // find goal + company to bump cache
    const goal = await this.db
      .select({
        id: performanceGoals.id,
        parentGoalId: performanceGoals.parentGoalId,
        companyId: performanceGoals.companyId,
      })
      .from(performanceGoals)
      .where(eq(performanceGoals.id, goalId))
      .limit(1)
      .execute()
      .then((res) => res[0]);

    if (!goal) throw new Error('Goal not found');

    const groupId = goal.parentGoalId || goal.id;

    await this.db
      .update(performanceGoals)
      .set({ status: 'active', updatedAt: new Date() })
      .where(
        or(
          eq(performanceGoals.id, groupId),
          eq(performanceGoals.parentGoalId, groupId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(goal.companyId);
  }

  async archiveForEmployee(goalId: string, employeeId: string, user: User) {
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.id, employeeId),
          eq(employees.companyId, user.companyId),
        ),
      )
      .execute();

    if (!employee) {
      throw new NotFoundException('Employee not found in company');
    }

    const [existingGoal] = await this.db
      .select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, goalId),
          eq(performanceGoals.employeeId, employeeId),
          eq(performanceGoals.companyId, user.companyId),
        ),
      )
      .execute();

    if (!existingGoal) {
      throw new NotFoundException(
        'Goal not found or not assigned to this employee',
      );
    }

    if (existingGoal.status !== 'draft') {
      throw new BadRequestException('Only draft goals can be archived');
    }

    await this.db
      .update(performanceGoals)
      .set({
        isArchived: true,
        updatedAt: new Date(),
        assignedBy: user.id,
        status: 'archived',
      })
      .where(eq(performanceGoals.id, goalId))
      .execute();

    await this.auditService.logAction({
      action: 'unassign',
      entity: 'performance_goal',
      entityId: goalId,
      userId: user.id,
      details: `Archived goal for employee ${employeeId}`,
    });

    await this.cache.bumpCompanyVersion(user.companyId);

    return { message: 'Goal archived for employee' };
  }
}
