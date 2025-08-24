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
exports.PolicyService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const cache_service_1 = require("../../../common/cache/cache.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const policies_and_checkins_schema_1 = require("./schema/policies-and-checkins.schema");
const performance_goals_schema_1 = require("../goals/schema/performance-goals.schema");
const schema_1 = require("../../../drizzle/schema");
const goal_notification_service_1 = require("../../notification/services/goal-notification.service");
const SYSTEM_POLICY_DEFAULTS = {
    visibility: 'company',
    cadence: 'monthly',
    timezone: 'Europe/London',
    anchorDow: 1,
    anchorHour: 9,
};
let PolicyService = class PolicyService {
    constructor(db, audit, cache, notification, emailQueue) {
        this.db = db;
        this.audit = audit;
        this.cache = cache;
        this.notification = notification;
        this.emailQueue = emailQueue;
    }
    tags(companyId) {
        return [`company:${companyId}:performance:policy`];
    }
    async invalidate(companyId) {
        await this.cache.bumpCompanyVersion(companyId);
    }
    async getOrCreateCompanyPolicy(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['policy', 'company'], async () => {
            const [existing] = await this.db
                .select()
                .from(policies_and_checkins_schema_1.performanceGoalCompanyPolicies)
                .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceGoalCompanyPolicies.companyId, companyId))
                .limit(1);
            if (existing)
                return existing;
            const now = new Date();
            const [created] = await this.db
                .insert(policies_and_checkins_schema_1.performanceGoalCompanyPolicies)
                .values({
                companyId,
                defaultVisibility: SYSTEM_POLICY_DEFAULTS.visibility,
                defaultCadence: SYSTEM_POLICY_DEFAULTS.cadence,
                defaultTimezone: SYSTEM_POLICY_DEFAULTS.timezone,
                defaultAnchorDow: SYSTEM_POLICY_DEFAULTS.anchorDow,
                defaultAnchorHour: SYSTEM_POLICY_DEFAULTS.anchorHour,
                createdAt: now,
                updatedAt: now,
            })
                .onConflictDoNothing()
                .returning();
            if (created)
                return created;
            const [row] = await this.db
                .select()
                .from(policies_and_checkins_schema_1.performanceGoalCompanyPolicies)
                .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceGoalCompanyPolicies.companyId, companyId))
                .limit(1);
            return row;
        }, { tags: this.tags(companyId) });
    }
    async upsertCompanyPolicy(companyId, userId, dto) {
        this.validate(dto);
        const now = new Date();
        const [row] = await this.db
            .insert(policies_and_checkins_schema_1.performanceGoalCompanyPolicies)
            .values({ companyId, ...dto, updatedAt: now })
            .onConflictDoUpdate({
            target: policies_and_checkins_schema_1.performanceGoalCompanyPolicies.companyId,
            set: { ...dto, updatedAt: now },
        })
            .returning();
        await this.audit.logAction({
            action: 'upsert',
            entity: 'performance_goal_company_policies',
            entityId: row.id,
            userId,
            details: `Upserted company policy for ${companyId}`,
            changes: dto,
        });
        await this.invalidate(companyId);
        return row;
    }
    async getEffectivePolicy(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['policy', 'effective'], async () => {
            const company = await this.getOrCreateCompanyPolicy(companyId);
            return {
                visibility: (company?.defaultVisibility ??
                    SYSTEM_POLICY_DEFAULTS.visibility),
                cadence: (company?.defaultCadence ??
                    SYSTEM_POLICY_DEFAULTS.cadence),
                timezone: company?.defaultTimezone ?? SYSTEM_POLICY_DEFAULTS.timezone,
                anchorDow: company?.defaultAnchorDow ?? SYSTEM_POLICY_DEFAULTS.anchorDow,
                anchorHour: company?.defaultAnchorHour ?? SYSTEM_POLICY_DEFAULTS.anchorHour,
            };
        }, { tags: this.tags(companyId) });
    }
    async upsertGoalScheduleFromPolicy(goalId, companyId, tx, overrides) {
        const [goal] = await (tx ?? this.db)
            .select({
            id: performance_goals_schema_1.performanceGoals.id,
            companyId: performance_goals_schema_1.performanceGoals.companyId,
            isArchived: performance_goals_schema_1.performanceGoals.isArchived,
        })
            .from(performance_goals_schema_1.performanceGoals)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, goalId), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId)))
            .limit(1);
        if (!goal)
            throw new common_1.BadRequestException('Goal not found');
        const eff = await this.getEffectivePolicy(companyId);
        const cadence = overrides?.cadence ?? eff.cadence;
        const timezone = overrides?.timezone ?? eff.timezone;
        const anchorDow = overrides?.anchorDow ?? eff.anchorDow;
        const anchorHour = overrides?.anchorHour ?? eff.anchorHour;
        const nextDueAt = this.computeNextDueAt(new Date(), cadence, anchorDow, anchorHour);
        const [existing] = await (tx ?? this.db)
            .select()
            .from(policies_and_checkins_schema_1.performanceGoalCheckinSchedules)
            .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceGoalCheckinSchedules.goalId, goalId))
            .limit(1);
        if (existing) {
            const [updated] = await (tx ?? this.db)
                .update(policies_and_checkins_schema_1.performanceGoalCheckinSchedules)
                .set({
                frequency: cadence,
                timezone,
                anchorDow,
                anchorHour,
                nextDueAt,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceGoalCheckinSchedules.id, existing.id))
                .returning();
            return updated;
        }
        const [created] = await (tx ?? this.db)
            .insert(policies_and_checkins_schema_1.performanceGoalCheckinSchedules)
            .values({
            goalId,
            frequency: cadence,
            timezone,
            anchorDow,
            anchorHour,
            nextDueAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning();
        return created;
    }
    validate(dto) {
        const inSet = (v, set) => v === undefined || set.includes(v);
        if (!inSet(dto.defaultVisibility, ['private', 'manager', 'company']))
            throw new common_1.BadRequestException('defaultVisibility must be private|manager|company');
        if (!inSet(dto.defaultCadence, ['weekly', 'biweekly', 'monthly']))
            throw new common_1.BadRequestException('defaultCadence must be weekly|biweekly|monthly');
        if (dto.defaultAnchorDow !== undefined &&
            (dto.defaultAnchorDow < 1 || dto.defaultAnchorDow > 7))
            throw new common_1.BadRequestException('defaultAnchorDow must be 1..7');
        if (dto.defaultAnchorHour !== undefined &&
            (dto.defaultAnchorHour < 0 || dto.defaultAnchorHour > 23))
            throw new common_1.BadRequestException('defaultAnchorHour must be 0..23');
    }
    computeNextDueAt(from, cadence, anchorDow, anchorHour) {
        const now = new Date(from);
        const result = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), anchorHour, 0, 0, 0));
        const jsTarget = anchorDow % 7 === 0 ? 0 : anchorDow % 7;
        const jsNow = result.getUTCDay();
        let addDays = (jsTarget - jsNow + 7) % 7;
        if (addDays === 0 && result <= now)
            addDays = 7;
        result.setUTCDate(result.getUTCDate() + addDays);
        if (cadence === 'biweekly') {
        }
        else if (cadence === 'monthly') {
            result.setUTCDate(result.getUTCDate() + 28);
        }
        return result;
    }
    async processDueGoalCheckins(opts) {
        const { companyId, limit = 200 } = opts ?? {};
        const now = new Date();
        const baseQuery = this.db
            .select({
            scheduleId: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.id,
            goalId: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.goalId,
            nextDueAt: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.nextDueAt,
            frequency: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.frequency,
            goalTitle: performance_goals_schema_1.performanceGoals.title,
            goalCompanyId: performance_goals_schema_1.performanceGoals.companyId,
            isArchived: performance_goals_schema_1.performanceGoals.isArchived,
            employeeId: performance_goals_schema_1.performanceGoals.employeeId,
            employeeUserId: schema_1.users.id,
            employeeEmail: schema_1.users.email,
            employeeName: schema_1.users.firstName,
        })
            .from(policies_and_checkins_schema_1.performanceGoalCheckinSchedules)
            .innerJoin(performance_goals_schema_1.performanceGoals, (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.id, policies_and_checkins_schema_1.performanceGoalCheckinSchedules.goalId))
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, performance_goals_schema_1.performanceGoals.employeeId))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.employees.userId));
        const due = await (companyId
            ? baseQuery.where((0, drizzle_orm_1.and)((0, drizzle_orm_1.lte)(policies_and_checkins_schema_1.performanceGoalCheckinSchedules.nextDueAt, now), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.companyId, companyId)))
            : baseQuery.where((0, drizzle_orm_1.and)((0, drizzle_orm_1.lte)(policies_and_checkins_schema_1.performanceGoalCheckinSchedules.nextDueAt, now), (0, drizzle_orm_1.eq)(performance_goals_schema_1.performanceGoals.isArchived, false)))).limit(limit);
        if (!due.length) {
            return { processed: 0, enqueued: 0, skipped: 0, advanced: 0 };
        }
        let enqueued = 0;
        let skipped = 0;
        let advanced = 0;
        for (const r of due) {
            try {
                await this.db.transaction(async (tx) => {
                    const [row] = await tx
                        .select({
                        id: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.id,
                        nextDueAt: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.nextDueAt,
                        frequency: policies_and_checkins_schema_1.performanceGoalCheckinSchedules.frequency,
                    })
                        .from(policies_and_checkins_schema_1.performanceGoalCheckinSchedules)
                        .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceGoalCheckinSchedules.id, r.scheduleId))
                        .limit(1);
                    if (!row) {
                        skipped++;
                        return;
                    }
                    if (row.nextDueAt > new Date()) {
                        skipped++;
                        return;
                    }
                    if (r.employeeUserId && r.employeeEmail) {
                        const jobId = `goal-checkin:${r.scheduleId}:${row.nextDueAt.getTime()}`;
                        await this.emailQueue.add('sendGoalCheckin', {
                            email: r.employeeEmail,
                            name: r.employeeName,
                            goalTitle: r.goalTitle,
                            meta: { goalId: r.goalId, scheduleId: r.scheduleId },
                            toUserId: r.employeeUserId,
                            subject: `Check-in: "${r.goalTitle}"`,
                            body: `Please update your progress for goal "${r.goalTitle}".`,
                        }, {
                            jobId,
                            removeOnComplete: 1000,
                            removeOnFail: 500,
                        });
                        enqueued++;
                    }
                    else {
                        skipped++;
                    }
                    const next = this.rollForward(row.nextDueAt, row.frequency, new Date());
                    await tx
                        .update(policies_and_checkins_schema_1.performanceGoalCheckinSchedules)
                        .set({ nextDueAt: next, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceGoalCheckinSchedules.id, r.scheduleId));
                    advanced++;
                    await this.audit.logAction({
                        action: 'enqueue',
                        entity: 'performance_goal_checkin',
                        entityId: r.scheduleId,
                        userId: 'system',
                        details: `Enqueued goal check-in for goal ${r.goalId} (${row.frequency})`,
                        changes: { previousNextDueAt: r.nextDueAt, nextNextDueAt: next },
                    });
                });
            }
            catch {
                skipped++;
            }
        }
        return { processed: due.length, enqueued, skipped, advanced };
    }
    rollForward(current, freq, now) {
        const stepDays = freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : 28;
        let next = new Date(current);
        while (next <= now) {
            next = new Date(next.getTime() + stepDays * 24 * 60 * 60 * 1000);
        }
        return next;
    }
};
exports.PolicyService = PolicyService;
exports.PolicyService = PolicyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(4, (0, bullmq_1.InjectQueue)('emailQueue')),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService,
        goal_notification_service_1.GoalNotificationService,
        bullmq_2.Queue])
], PolicyService);
//# sourceMappingURL=goal-policy.service.js.map