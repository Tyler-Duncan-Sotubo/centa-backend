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
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const performance_goals_schema_1 = require("./schema/performance-goals.schema");
const audit_service_1 = require("../../audit/audit.service");
const performance_goal_updates_schema_1 = require("./schema/performance-goal-updates.schema");
const goal_attachments_schema_1 = require("./schema/goal-attachments.schema");
const goal_comments_schema_1 = require("./schema/goal-comments.schema");
const schema_1 = require("../../../drizzle/schema");
const pg_core_1 = require("drizzle-orm/pg-core");
const goal_policy_service_1 = require("./goal-policy.service");
const goal_notification_service_1 = require("../../notification/services/goal-notification.service");
let GoalsService = class GoalsService {
    constructor(db, auditService, policy, goalNotification) {
        this.db = db;
        this.auditService = auditService;
        this.policy = policy;
        this.goalNotification = goalNotification;
        this.isHrOrAdmin = (user) => ['super_admin', 'admin', 'hr_admin'].includes(user.role);
    }
    async getEmployeeById(tx, companyId, employeeId) {
        const [emp] = await tx
            .select({
            id: schema_1.employees.id,
            userId: schema_1.employees.userId,
            managerId: schema_1.employees.managerId,
            companyId: schema_1.employees.companyId,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)))
            .limit(1);
        return emp;
    }
    async create(dto, user) {
        const { title, description, startDate, dueDate, weight, employeeId, groupId, status, } = dto;
        if (!startDate)
            throw new common_1.BadRequestException('startDate is required.');
        if (!!employeeId === !!groupId) {
            throw new common_1.BadRequestException('Provide exactly one owner: employeeId OR groupId.');
        }
        const normDate = (d) => typeof d === 'string' ? d : d.toISOString().slice(0, 10);
        const startDateStr = normDate(startDate);
        const dueDateStr = normDate(dueDate);
        const now = new Date();
        const isPrivileged = () => {
            const role = user.role ?? user.userRole ?? null;
            return ['super_admin', 'admin', 'hr_admin', 'hr_manager'].includes(role);
        };
        return this.db.transaction(async (tx) => {
            const [cycle] = await tx
                .select({ id: schema_1.performanceCycles.id })
                .from(schema_1.performanceCycles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.performanceCycles.companyId, user.companyId), (0, drizzle_orm_1.lte)(schema_1.performanceCycles.startDate, startDateStr), (0, drizzle_orm_1.gte)(schema_1.performanceCycles.endDate, startDateStr)))
                .limit(1);
            if (!cycle) {
                throw new common_1.BadRequestException('No performance cycle covers the provided startDate.');
            }
            const [assigner] = await tx
                .select({
                id: schema_1.users.id,
                fullName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id))
                .limit(1);
            const assignedByName = assigner?.fullName ?? `${user.id}`;
            const [creatorEmployee] = await tx
                .select({
                id: schema_1.employees.id,
                userId: schema_1.employees.userId,
                companyId: schema_1.employees.companyId,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.userId, user.id), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId)))
                .limit(1);
            const creatorIsPrivileged = isPrivileged();
            const creatorIsEmployee = !!creatorEmployee;
            let targetEmployeeIds = [];
            if (employeeId) {
                targetEmployeeIds = [employeeId];
            }
            else {
                const members = await tx
                    .select({ employeeId: schema_1.groupMemberships.employeeId })
                    .from(schema_1.groupMemberships)
                    .where((0, drizzle_orm_1.eq)(schema_1.groupMemberships.groupId, groupId));
                const uniqueEmployeeIds = [
                    ...new Set(members.map((m) => m.employeeId)),
                ];
                if (uniqueEmployeeIds.length === 0) {
                    throw new common_1.BadRequestException('Selected group has no members.');
                }
                targetEmployeeIds = uniqueEmployeeIds;
            }
            if (!creatorIsPrivileged && creatorIsEmployee) {
                if (groupId) {
                    throw new common_1.BadRequestException('You cannot create goals for a group.');
                }
                const selfId = creatorEmployee.id;
                if (targetEmployeeIds.length !== 1 || targetEmployeeIds[0] !== selfId) {
                    throw new common_1.BadRequestException('You can only create goals for yourself.');
                }
            }
            const employeesInfo = await tx
                .select({
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                email: schema_1.employees.email,
                companyId: schema_1.employees.companyId,
                managerId: schema_1.employees.managerId,
                userId: schema_1.employees.userId,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.inArray)(schema_1.employees.id, targetEmployeeIds));
            const foundIds = new Set(employeesInfo.map((e) => e.id));
            const missing = targetEmployeeIds.filter((id) => !foundIds.has(id));
            if (missing.length) {
                throw new common_1.NotFoundException(`Some employees not found: ${missing.join(', ')}`);
            }
            const outsideCompany = employeesInfo.filter((e) => e.companyId !== user.companyId);
            if (outsideCompany.length) {
                throw new common_1.BadRequestException('One or more employees are outside your company.');
            }
            const computedStatus = creatorIsPrivileged
                ? (status ?? 'draft')
                : 'pending_approval';
            const goalsToInsert = employeesInfo.map((emp) => ({
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
                .insert(performance_goals_schema_1.performanceGoals)
                .values(goalsToInsert)
                .returning({
                id: performance_goals_schema_1.performanceGoals.id,
                employeeId: performance_goals_schema_1.performanceGoals.employeeId,
                status: performance_goals_schema_1.performanceGoals.status,
            });
            await Promise.all(created.map((g) => this.policy.upsertGoalScheduleFromPolicy(g.id, user.companyId, tx)));
            await this.auditService.logAction({
                action: 'create',
                entity: 'performance_goal',
                entityId: created[0]?.id ?? null,
                userId: user.id,
                details: targetEmployeeIds.length === 1
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
            const goalIdByEmployee = new Map(created.map((g) => [g.employeeId, g.id]));
            if (computedStatus !== 'pending_approval') {
                await Promise.all(employeesInfo.map((emp) => this.goalNotification.sendGoalAssignment({
                    toEmail: emp.email,
                    subject: `New Goal Assigned: ${title}`,
                    assignedBy: assignedByName,
                    assignedTo: emp.firstName ?? '',
                    title,
                    dueDate: dueDateStr,
                    description: description ?? '',
                    progress: computedStatus,
                    meta: { goalId: goalIdByEmployee.get(emp.id) ?? null },
                })));
                return created;
            }
            const emp = employeesInfo[0];
            const goalId = goalIdByEmployee.get(emp.id) ?? null;
            if (!emp?.managerId) {
                throw new common_1.BadRequestException('Cannot request approval: this employee has no manager assigned.');
            }
            const [manager] = await tx
                .select({
                email: schema_1.users.email,
                firstName: schema_1.users.firstName,
                lastName: schema_1.users.lastName,
            })
                .from(schema_1.employees)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, emp.managerId))
                .limit(1);
            if (!manager?.email) {
                throw new common_1.BadRequestException('Cannot request approval: manager does not have an email address.');
            }
            const employeeFullName = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
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
    async findAll(companyId, status) {
        const today = new Date().toISOString().slice(0, 10);
        const conditions = [(0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId)];
        if (status === 'archived') {
            conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, true));
        }
        else {
            conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false));
            switch (status) {
                case 'draft':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'draft'));
                    break;
                case 'incomplete':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'incomplete'));
                    break;
                case 'completed':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'completed'));
                    break;
                case 'overdue':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'incomplete'), (0, drizzle_orm_1.lt)(performance_goals_schema_1.performanceGoals.dueDate, today));
                    break;
            }
        }
        const goals = await this.db
            .select({
            id: performance_goals_schema_1.performanceGoals.id,
            title: performance_goals_schema_1.performanceGoals.title,
            description: performance_goals_schema_1.performanceGoals.description,
            parentGoalId: performance_goals_schema_1.performanceGoals.parentGoalId,
            dueDate: performance_goals_schema_1.performanceGoals.dueDate,
            startDate: performance_goals_schema_1.performanceGoals.startDate,
            cycleId: performance_goals_schema_1.performanceGoals.cycleId,
            weight: performance_goals_schema_1.performanceGoals.weight,
            status: performance_goals_schema_1.performanceGoals.status,
            isArchived: performance_goals_schema_1.performanceGoals.isArchived,
            employee: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            employeeId: schema_1.employees.id,
            departmentName: schema_1.departments.name,
            departmentId: schema_1.departments.id,
            jobRoleName: schema_1.jobRoles.title,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_goals_schema_1.performanceGoals.employeeId))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(performance_goals_schema_1.performanceGoals.assignedAt))
            .execute();
        const latestProgress = await this.db
            .select({
            goalId: performance_goal_updates_schema_1.performanceGoalUpdates.goalId,
            progress: performance_goal_updates_schema_1.performanceGoalUpdates.progress,
        })
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.inArray)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, goals.map((g) => g.id)))
            .orderBy((0, drizzle_orm_1.desc)(performance_goal_updates_schema_1.performanceGoalUpdates.createdAt))
            .execute();
        const progressMap = new Map();
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
    async findAllByEmployeeId(companyId, employeeId, status) {
        const today = new Date().toISOString().slice(0, 10);
        const conditions = [
            (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId),
            (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.employeeId, employeeId),
        ];
        if (status === 'archived') {
            conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, true));
        }
        else {
            conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false));
            switch (status) {
                case 'draft':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'draft'));
                    break;
                case 'incomplete':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'incomplete'));
                    break;
                case 'completed':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'completed'));
                    break;
                case 'overdue':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'incomplete'), (0, drizzle_orm_1.lt)(performance_goals_schema_1.performanceGoals.dueDate, today));
                    break;
            }
        }
        const goals = await this.db
            .select({
            id: performance_goals_schema_1.performanceGoals.id,
            title: performance_goals_schema_1.performanceGoals.title,
            description: performance_goals_schema_1.performanceGoals.description,
            parentGoalId: performance_goals_schema_1.performanceGoals.parentGoalId,
            dueDate: performance_goals_schema_1.performanceGoals.dueDate,
            startDate: performance_goals_schema_1.performanceGoals.startDate,
            cycleId: performance_goals_schema_1.performanceGoals.cycleId,
            weight: performance_goals_schema_1.performanceGoals.weight,
            status: performance_goals_schema_1.performanceGoals.status,
            isArchived: performance_goals_schema_1.performanceGoals.isArchived,
            employee: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            employeeId: schema_1.employees.id,
            departmentName: schema_1.departments.name,
            departmentId: schema_1.departments.id,
            jobRoleName: schema_1.jobRoles.title,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_goals_schema_1.performanceGoals.employeeId))
            .leftJoin(schema_1.jobRoles, (0, drizzle_orm_1.eq)(schema_1.jobRoles.id, schema_1.employees.jobRoleId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(performance_goals_schema_1.performanceGoals.assignedAt))
            .execute();
        const latestProgress = await this.db
            .select({
            goalId: performance_goal_updates_schema_1.performanceGoalUpdates.goalId,
            progress: performance_goal_updates_schema_1.performanceGoalUpdates.progress,
        })
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.inArray)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, goals.map((g) => g.id)))
            .orderBy((0, drizzle_orm_1.desc)(performance_goal_updates_schema_1.performanceGoalUpdates.createdAt))
            .execute();
        const progressMap = new Map();
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
    async findOne(id, companyId) {
        const managerEmployee = (0, pg_core_1.alias)(schema_1.employees, 'manager_employee');
        const managerUser = (0, pg_core_1.alias)(schema_1.users, 'manager_user');
        const employeeUser = (0, pg_core_1.alias)(schema_1.users, 'employee_user');
        const [goal] = await this.db
            .select({
            id: performance_goals_schema_1.performanceGoals.id,
            title: performance_goals_schema_1.performanceGoals.title,
            description: performance_goals_schema_1.performanceGoals.description,
            dueDate: performance_goals_schema_1.performanceGoals.dueDate,
            startDate: performance_goals_schema_1.performanceGoals.startDate,
            cycleId: performance_goals_schema_1.performanceGoals.cycleId,
            cycleName: schema_1.performanceCycles.name,
            weight: performance_goals_schema_1.performanceGoals.weight,
            status: performance_goals_schema_1.performanceGoals.status,
            isArchived: performance_goals_schema_1.performanceGoals.isArchived,
            avatarUrl: schema_1.users.avatar,
            employee: (0, drizzle_orm_1.sql) `CONCAT(${employeeUser.firstName}, ' ', ${employeeUser.lastName})`,
            employeeId: schema_1.employees.id,
            departmentName: schema_1.departments.name,
            departmentId: schema_1.departments.id,
            office: schema_1.companyLocations.name,
            manager: (0, drizzle_orm_1.sql) `COALESCE(CONCAT(${managerUser.firstName}, ' ', ${managerUser.lastName}), 'Super Admin')`,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_goals_schema_1.performanceGoals.employeeId))
            .innerJoin(employeeUser, (0, drizzle_orm_1.eq)(employeeUser.id, schema_1.employees.userId))
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId))
            .leftJoin(managerEmployee, (0, drizzle_orm_1.eq)(managerEmployee.id, schema_1.employees.managerId))
            .leftJoin(managerUser, (0, drizzle_orm_1.eq)(managerUser.id, managerEmployee.userId))
            .innerJoin(schema_1.performanceCycles, (0, drizzle_orm_1.eq)(schema_1.performanceCycles.id, performance_goals_schema_1.performanceGoals.cycleId))
            .innerJoin(schema_1.companyLocations, (0, drizzle_orm_1.eq)(schema_1.companyLocations.id, schema_1.employees.locationId))
            .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.departments.id, schema_1.employees.departmentId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, id), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId)));
        if (!goal) {
            throw new common_1.NotFoundException('Goal not found');
        }
        const [updates, comments, attachments] = await Promise.all([
            this.db
                .select({
                id: performance_goal_updates_schema_1.performanceGoalUpdates.id,
                progress: performance_goal_updates_schema_1.performanceGoalUpdates.progress,
                note: performance_goal_updates_schema_1.performanceGoalUpdates.note,
                createdAt: performance_goal_updates_schema_1.performanceGoalUpdates.createdAt,
                createdBy: performance_goal_updates_schema_1.performanceGoalUpdates.createdBy,
                createdByName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(performance_goal_updates_schema_1.performanceGoalUpdates)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, performance_goal_updates_schema_1.performanceGoalUpdates.createdBy))
                .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, id))
                .orderBy((0, drizzle_orm_1.desc)(performance_goal_updates_schema_1.performanceGoalUpdates.createdAt)),
            this.db
                .select({
                id: goal_comments_schema_1.goalComments.id,
                comment: goal_comments_schema_1.goalComments.comment,
                createdAt: goal_comments_schema_1.goalComments.createdAt,
                createdBy: goal_comments_schema_1.goalComments.authorId,
                createdByName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            })
                .from(goal_comments_schema_1.goalComments)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, goal_comments_schema_1.goalComments.authorId))
                .where((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.goalId, id)),
            this.db
                .select({
                id: goal_attachments_schema_1.goalAttachments.id,
                fileName: goal_attachments_schema_1.goalAttachments.fileName,
                createdAt: goal_attachments_schema_1.goalAttachments.createdAt,
                uploadedBy: goal_attachments_schema_1.goalAttachments.uploadedById,
                uploadedByName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
                fileUrl: goal_attachments_schema_1.goalAttachments.fileUrl,
                comment: goal_attachments_schema_1.goalAttachments.comment,
            })
                .from(goal_attachments_schema_1.goalAttachments)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, goal_attachments_schema_1.goalAttachments.uploadedById))
                .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.goalId, id)),
        ]);
        return {
            ...goal,
            updates,
            comments,
            attachments,
        };
    }
    async getStatusCountForEmployee(companyId, employeeId) {
        const rows = await this.db
            .select({
            status: performance_goals_schema_1.performanceGoals.status,
            count: (0, drizzle_orm_1.sql) `cast(count(*) as int)`,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.employeeId, employeeId)))
            .groupBy(performance_goals_schema_1.performanceGoals.status);
        const counts = {
            published: 0,
            incomplete: 0,
            completed: 0,
            overdue: 0,
            archived: 0,
        };
        for (const r of rows)
            counts[r.status] = r.count ?? 0;
        return counts;
    }
    async getStatusCount(companyId) {
        const rows = await this.db
            .select({
            status: performance_goals_schema_1.performanceGoals.status,
            count: (0, drizzle_orm_1.sql) `cast(count(*) as int)`,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId))
            .groupBy(performance_goals_schema_1.performanceGoals.status);
        const counts = {
            published: 0,
            incomplete: 0,
            completed: 0,
            overdue: 0,
            archived: 0,
        };
        for (const r of rows)
            counts[r.status] = r.count ?? 0;
        return counts;
    }
    async update(id, dto, user) {
        const [existing] = await this.db
            .select()
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, id), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, user.companyId)));
        if (!existing) {
            throw new common_1.NotFoundException('Goal not found or not assigned to this user');
        }
        const [latestUpdate] = await this.db
            .select()
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, id))
            .orderBy((0, drizzle_orm_1.desc)(performance_goal_updates_schema_1.performanceGoalUpdates.createdAt))
            .limit(1);
        const latestProgress = latestUpdate?.progress ?? 0;
        if (latestProgress >= 100) {
            throw new common_1.BadRequestException('Cannot update a completed goal');
        }
        const [updated] = await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({
            ...dto,
            assignedBy: user.id,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, id))
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
    async remove(id, user) {
        const role = user.role ?? user.userRole ?? null;
        console.log('Attempting to archive goal', { id, userId: user.id, role });
        const canArchive = [
            'super_admin',
            'admin',
            'hr_admin',
            'hr_manager',
        ].includes(role);
        if (!canArchive) {
            throw new common_1.BadRequestException('You are not allowed to delete goals.');
        }
        const [existing] = await this.db
            .select({
            id: performance_goals_schema_1.performanceGoals.id,
            title: performance_goals_schema_1.performanceGoals.title,
            isArchived: performance_goals_schema_1.performanceGoals.isArchived,
            companyId: performance_goals_schema_1.performanceGoals.companyId,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, id), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, user.companyId)))
            .limit(1);
        if (!existing) {
            throw new common_1.NotFoundException('Goal not found');
        }
        if (existing.isArchived) {
            return { message: 'Goal is already archived' };
        }
        await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({
            isArchived: true,
            updatedAt: new Date(),
            assignedBy: user.id,
            status: 'archived',
        })
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, id))
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
    async publishGoalAndSubGoals(goalId) {
        const goal = await this.db
            .select({
            id: performance_goals_schema_1.performanceGoals.id,
            parentGoalId: performance_goals_schema_1.performanceGoals.parentGoalId,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
            .limit(1)
            .then((res) => res[0]);
        if (!goal) {
            throw new Error('Goal not found');
        }
        const groupId = goal.parentGoalId || goal.id;
        await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({ status: 'active', updatedAt: new Date() })
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, groupId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.parentGoalId, groupId)));
    }
    async archiveForEmployee(goalId, employeeId, user) {
        const [employee] = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId)));
        if (!employee) {
            throw new common_1.NotFoundException('Employee not found in company');
        }
        const [existingGoal] = await this.db
            .select()
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.employeeId, employeeId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, user.companyId)));
        if (!existingGoal) {
            throw new common_1.NotFoundException('Goal not found or not assigned to this employee');
        }
        if (existingGoal.isArchived) {
            throw new common_1.BadRequestException('Goal is already archived');
        }
        const [{ updatesCount }] = await this.db
            .select({ updatesCount: (0, drizzle_orm_1.sql) `COUNT(*)::int` })
            .from(performance_goal_updates_schema_1.performanceGoalUpdates)
            .where((0, drizzle_orm_1.eq)(performance_goal_updates_schema_1.performanceGoalUpdates.goalId, goalId));
        const [{ commentsCount }] = await this.db
            .select({ commentsCount: (0, drizzle_orm_1.sql) `COUNT(*)::int` })
            .from(goal_comments_schema_1.goalComments)
            .where((0, drizzle_orm_1.eq)(goal_comments_schema_1.goalComments.goalId, goalId));
        const [{ attachmentsCount }] = await this.db
            .select({ attachmentsCount: (0, drizzle_orm_1.sql) `COUNT(*)::int` })
            .from(goal_attachments_schema_1.goalAttachments)
            .where((0, drizzle_orm_1.eq)(goal_attachments_schema_1.goalAttachments.goalId, goalId));
        const hasActivity = (updatesCount ?? 0) > 0 ||
            (commentsCount ?? 0) > 0 ||
            (attachmentsCount ?? 0) > 0;
        if (hasActivity) {
            throw new common_1.BadRequestException('Goal has activity and cannot be deleted');
        }
        await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({
            isArchived: true,
            status: 'archived',
            updatedAt: new Date(),
            assignedBy: user.id,
        })
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
            .execute();
        await this.auditService.logAction({
            action: 'archive',
            entity: 'performance_goal',
            entityId: goalId,
            userId: user.id,
            details: `Archived goal for employee ${employeeId}`,
        });
        return {
            message: 'Goal archived for employee',
            activity: { updatesCount, commentsCount, attachmentsCount },
            deletable: !hasActivity,
        };
    }
    async approveGoal(goalId, user) {
        const role = user.role ?? user.userRole ?? null;
        const isPrivileged = [
            'super_admin',
            'admin',
            'hr_admin',
            'hr_manager',
        ].includes(role);
        return await this.db.transaction(async (tx) => {
            const [goal] = await tx
                .select({
                id: performance_goals_schema_1.performanceGoals.id,
                status: performance_goals_schema_1.performanceGoals.status,
                employeeId: performance_goals_schema_1.performanceGoals.employeeId,
            })
                .from(performance_goals_schema_1.performanceGoals)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, user.companyId)))
                .limit(1);
            if (!goal)
                throw new common_1.NotFoundException('Goal not found');
            if (!goal.employeeId)
                throw new common_1.BadRequestException('Goal has no employee owner');
            if (!isPrivileged) {
                const [managerEmp] = await tx
                    .select({
                    id: schema_1.employees.id,
                })
                    .from(schema_1.employees)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.userId, user.id), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId)))
                    .limit(1);
                if (!managerEmp) {
                    throw new common_1.BadRequestException('Manager employee record not found.');
                }
                const [targetEmp] = await tx
                    .select({
                    id: schema_1.employees.id,
                    managerId: schema_1.employees.managerId,
                })
                    .from(schema_1.employees)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.id, goal.employeeId), (0, drizzle_orm_1.eq)(schema_1.employees.companyId, user.companyId)))
                    .limit(1);
                if (!targetEmp) {
                    throw new common_1.NotFoundException('Target employee not found.');
                }
                if (targetEmp.managerId !== managerEmp.id) {
                    throw new common_1.BadRequestException('You are not allowed to approve goals for this employee.');
                }
            }
            const [updated] = await tx
                .update(performance_goals_schema_1.performanceGoals)
                .set({
                status: 'active',
                assignedBy: user.id,
                assignedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
                .returning({
                id: performance_goals_schema_1.performanceGoals.id,
                status: performance_goals_schema_1.performanceGoals.status,
                employeeId: performance_goals_schema_1.performanceGoals.employeeId,
            });
            await this.auditService.logAction({
                action: 'approve',
                entity: 'performance_goal',
                entityId: goalId,
                userId: user.id,
                details: `Approved goal`,
                changes: { status: 'active' },
            });
            return updated;
        });
    }
    async rejectGoal(goalId, reason, user) {
        if (!reason?.trim())
            throw new common_1.BadRequestException('Reason is required.');
        return await this.db.transaction(async (tx) => {
            const [goal] = await tx
                .select({
                id: performance_goals_schema_1.performanceGoals.id,
                status: performance_goals_schema_1.performanceGoals.status,
                employeeId: performance_goals_schema_1.performanceGoals.employeeId,
                isArchived: performance_goals_schema_1.performanceGoals.isArchived,
            })
                .from(performance_goals_schema_1.performanceGoals)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, user.companyId)))
                .limit(1);
            if (!goal || goal.isArchived)
                throw new common_1.NotFoundException('Goal not found.');
            if (goal.status !== 'pending_approval') {
                throw new common_1.BadRequestException('Only pending approval goals can be rejected.');
            }
            await tx.insert(goal_comments_schema_1.goalComments).values({
                goalId,
                comment: `Rejected: ${reason}`,
                authorId: user.id,
                createdAt: new Date(),
            });
            const [updated] = await tx
                .update(performance_goals_schema_1.performanceGoals)
                .set({ status: 'archived', updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
                .returning({
                id: performance_goals_schema_1.performanceGoals.id,
                status: performance_goals_schema_1.performanceGoals.status,
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
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        goal_policy_service_1.PolicyService,
        goal_notification_service_1.GoalNotificationService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map