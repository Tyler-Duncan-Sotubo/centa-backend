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
let GoalsService = class GoalsService {
    constructor(db, auditService) {
        this.db = db;
        this.auditService = auditService;
    }
    async create(dto, user) {
        const { title, description, dueDate, cycleId, startDate, ownerIds = [], weight, } = dto;
        const [parentGoal] = await this.db
            .insert(performance_goals_schema_1.performanceGoals)
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
            status: 'published',
        })
            .returning();
        const goalInstances = ownerIds.map((ownerId) => ({
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
            status: 'published',
        }));
        await this.db.insert(performance_goals_schema_1.performanceGoals).values(goalInstances);
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
        return parentGoal;
    }
    async findAll(companyId, status) {
        const today = new Date().toISOString().slice(0, 10);
        const conditions = [
            (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId),
            (0, drizzle_orm_1.isNotNull)(performance_goals_schema_1.performanceGoals.parentGoalId),
        ];
        if (status === 'archived') {
            conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, true));
        }
        else {
            conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false));
            switch (status) {
                case 'published':
                    conditions.push((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.status, 'published'));
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
        const [existing] = await this.db
            .select()
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, id), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, user.companyId)));
        if (!existing) {
            throw new common_1.NotFoundException('Goal not found');
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
        await this.db
            .update(performance_goals_schema_1.performanceGoals)
            .set({
            isArchived: true,
            updatedAt: new Date(),
            assignedBy: user.id,
            status: 'archived',
        })
            .where((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId))
            .execute();
        await this.auditService.logAction({
            action: 'unassign',
            entity: 'performance_goal',
            entityId: goalId,
            userId: user.id,
            details: `Archived goal for employee ${employeeId}`,
        });
        return { message: 'Goal archived for employee' };
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map