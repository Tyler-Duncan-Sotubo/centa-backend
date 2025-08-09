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
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
    private readonly cache: CacheService,
  ) {
    this.logger.setContext(GoalsService.name);
  }

  // -------- cache keys --------
  private listKey(companyId: string, status?: string) {
    return `goal:${companyId}:list:${status ?? 'all'}`;
  }
  private empListKey(companyId: string, employeeId: string, status?: string) {
    return `goal:${companyId}:emp:${employeeId}:list:${status ?? 'all'}`;
  }
  private oneKey(companyId: string, id: string) {
    return `goal:${companyId}:one:${id}`;
  }

  private async burst(opts: {
    companyId: string;
    goalId?: string;
    employeeId?: string;
  }) {
    const jobs: Promise<any>[] = [];

    // detail
    if (opts.goalId)
      jobs.push(this.cache.del(this.oneKey(opts.companyId, opts.goalId)));

    // company lists (we don’t know which status is cached; clear common ones)
    const statuses = [
      'all',
      'draft',
      'incomplete',
      'completed',
      'overdue',
      'archived',
    ];
    for (const s of statuses)
      jobs.push(this.cache.del(this.listKey(opts.companyId, s)));

    // employee lists (if provided)
    if (opts.employeeId) {
      for (const s of statuses) {
        jobs.push(
          this.cache.del(this.empListKey(opts.companyId, opts.employeeId!, s)),
        );
      }
    }

    await Promise.allSettled(jobs);
    this.logger.debug(opts, 'goals:cache:burst');
  }

  // -------- service methods --------

  async create(dto: CreateGoalDto, user: User) {
    this.logger.info({ companyId: user.companyId, dto }, 'goals:create:start');

    const {
      title,
      description,
      dueDate,
      cycleId,
      startDate,
      ownerIds = [],
      weight,
    } = dto;

    // parent/template goal
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
      .returning();

    // per-owner instances
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

    if (goalInstances.length) {
      await this.db.insert(performanceGoals).values(goalInstances);
    }

    await this.auditService.logAction({
      action: 'create',
      entity: 'performance_goal',
      entityId: parentGoal.id,
      userId: user.id,
      details: `Created goal template: ${parentGoal.title} for ${ownerIds.length} assignees`,
      changes: {
        title: parentGoal.title,
        description: parentGoal.description,
        cycleId: parentGoal.cycleId,
        ownerIds,
      },
    });

    // burst broad lists (we don’t know employee ids here beyond ownerIds)
    await this.burst({ companyId: user.companyId });
    // also burst each employee’s list
    await Promise.allSettled(
      ownerIds.map((eid) =>
        this.burst({ companyId: user.companyId, employeeId: eid }),
      ),
    );

    this.logger.info({ id: parentGoal.id }, 'goals:create:done');
    return parentGoal;
  }

  async findAll(companyId: string, status?: string) {
    const key = this.listKey(companyId, status);
    this.logger.debug({ companyId, key, status }, 'goals:findAll:cache:get');

    return this.cache.getOrSetCache(key, async () => {
      const today = new Date().toISOString().slice(0, 10);
      const conditions: any[] = [
        eq(performanceGoals.companyId, companyId),
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

      const progressMap = new Map<string, number>();
      for (const update of latestProgress) {
        if (!progressMap.has(update.goalId)) {
          progressMap.set(update.goalId, update.progress);
        }
      }

      const enriched = goals.map((g) => ({
        ...g,
        progress: progressMap.get(g.id) ?? 0,
      }));
      this.logger.debug(
        { companyId, count: enriched.length },
        'goals:findAll:db:done',
      );
      return enriched;
    });
  }

  async findAllByEmployeeId(
    companyId: string,
    employeeId: string,
    status?: string,
  ) {
    const key = this.empListKey(companyId, employeeId, status);
    this.logger.debug(
      { companyId, employeeId, key, status },
      'goals:findAllByEmp:cache:get',
    );

    return this.cache.getOrSetCache(key, async () => {
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

      const progressMap = new Map<string, number>();
      for (const update of latestProgress) {
        if (!progressMap.has(update.goalId)) {
          progressMap.set(update.goalId, update.progress);
        }
      }

      const enriched = goals.map((g) => ({
        ...g,
        progress: progressMap.get(g.id) ?? 0,
      }));
      this.logger.debug(
        { companyId, employeeId, count: enriched.length },
        'goals:findAllByEmp:db:done',
      );
      return enriched;
    });
  }

  async findOne(id: string, companyId: string) {
    const key = this.oneKey(companyId, id);
    this.logger.debug({ companyId, id, key }, 'goals:findOne:cache:get');

    return this.cache.getOrSetCache(key, async () => {
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
        );

      if (!goal) {
        this.logger.warn({ id, companyId }, 'goals:findOne:not-found');
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

      const result = { ...goal, updates, comments, attachments };
      this.logger.debug({ id }, 'goals:findOne:db:done');
      return result;
    });
  }

  async update(id: string, dto: UpdateGoalDto, user: User) {
    this.logger.info({ id, userId: user.id, dto }, 'goals:update:start');

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
      this.logger.warn(
        { id, companyId: user.companyId },
        'goals:update:not-found',
      );
      throw new NotFoundException(
        'Goal not found or not assigned to this user',
      );
    }

    const [latestUpdate] = await this.db
      .select()
      .from(performanceGoalUpdates)
      .where(eq(performanceGoalUpdates.goalId, id))
      .orderBy(desc(performanceGoalUpdates.createdAt))
      .limit(1);

    const latestProgress = latestUpdate?.progress ?? 0;
    if (latestProgress >= 100) {
      this.logger.warn({ id }, 'goals:update:completed');
      throw new BadRequestException('Cannot update a completed goal');
    }

    const [updated] = await this.db
      .update(performanceGoals)
      .set({ ...dto, assignedBy: user.id, updatedAt: new Date() })
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

    await this.burst({
      companyId: user.companyId,
      goalId: id,
      employeeId: updated.employeeId ?? undefined,
    });
    this.logger.info({ id }, 'goals:update:done');
    return updated;
  }

  async remove(id: string, user: User) {
    this.logger.info({ id, userId: user.id }, 'goals:remove:start');

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
      this.logger.warn({ id }, 'goals:remove:not-found');
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

    await this.burst({
      companyId: user.companyId,
      goalId: id,
      employeeId: existing.employeeId ?? undefined,
    });
    this.logger.info({ id }, 'goals:remove:done');
    return { message: 'Goal archived successfully' };
  }

  async publishGoalAndSubGoals(goalId: string) {
    this.logger.info({ goalId }, 'goals:publishGroup:start');

    const goal = await this.db
      .select({
        id: performanceGoals.id,
        parentGoalId: performanceGoals.parentGoalId,
        companyId: performanceGoals.companyId,
      })
      .from(performanceGoals)
      .where(eq(performanceGoals.id, goalId))
      .limit(1)
      .then((res) => res[0]);

    if (!goal) {
      this.logger.warn({ goalId }, 'goals:publishGroup:not-found');
      throw new Error('Goal not found');
    }

    const groupId = goal.parentGoalId || goal.id;

    await this.db
      .update(performanceGoals)
      .set({ status: 'active', updatedAt: new Date() })
      .where(
        or(
          eq(performanceGoals.id, groupId),
          eq(performanceGoals.parentGoalId, groupId),
        ),
      );

    await this.burst({ companyId: goal.companyId }); // broad burst
    this.logger.info({ groupId }, 'goals:publishGroup:done');
  }

  async archiveForEmployee(goalId: string, employeeId: string, user: User) {
    this.logger.info(
      { goalId, employeeId, userId: user.id },
      'goals:archiveForEmployee:start',
    );

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
      this.logger.warn(
        { employeeId },
        'goals:archiveForEmployee:emp-not-found',
      );
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
      );

    if (!existingGoal) {
      this.logger.warn(
        { goalId, employeeId },
        'goals:archiveForEmployee:goal-not-found',
      );
      throw new NotFoundException(
        'Goal not found or not assigned to this employee',
      );
    }

    if (existingGoal.status !== 'draft') {
      this.logger.warn(
        { goalId, status: existingGoal.status },
        'goals:archiveForEmployee:not-draft',
      );
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

    await this.burst({ companyId: user.companyId, goalId, employeeId });
    this.logger.info({ goalId, employeeId }, 'goals:archiveForEmployee:done');
    return { message: 'Goal archived for employee' };
  }
}
