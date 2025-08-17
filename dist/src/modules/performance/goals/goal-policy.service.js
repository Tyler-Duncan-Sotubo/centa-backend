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
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const audit_service_1 = require("../../audit/audit.service");
const performance_objectives_schema_1 = require("./schema/performance-objectives.schema");
const policies_and_checkins_schema_1 = require("./schema/policies-and-checkins.schema");
const SYSTEM_POLICY_DEFAULTS = {
    visibility: 'company',
    cadence: 'monthly',
    timezone: 'Europe/London',
    anchorDow: 1,
    anchorHour: 9,
    defaultOwnerIsLead: true,
};
let PolicyService = class PolicyService {
    constructor(db, audit) {
        this.db = db;
        this.audit = audit;
    }
    async getOrCreateCompanyPolicy(companyId) {
        const [existing] = await this.db
            .select()
            .from(policies_and_checkins_schema_1.performanceOkrCompanyPolicies)
            .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceOkrCompanyPolicies.companyId, companyId))
            .limit(1);
        if (existing)
            return existing;
        const now = new Date();
        const [created] = await this.db
            .insert(policies_and_checkins_schema_1.performanceOkrCompanyPolicies)
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
            .from(policies_and_checkins_schema_1.performanceOkrCompanyPolicies)
            .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceOkrCompanyPolicies.companyId, companyId))
            .limit(1);
        return row;
    }
    async upsertCompanyPolicy(companyId, userId, dto) {
        this.validatePolicyPatch(dto);
        const now = new Date();
        const [row] = await this.db
            .insert(policies_and_checkins_schema_1.performanceOkrCompanyPolicies)
            .values({ companyId, ...dto, updatedAt: now })
            .onConflictDoUpdate({
            target: policies_and_checkins_schema_1.performanceOkrCompanyPolicies.companyId,
            set: { ...dto, updatedAt: now },
        })
            .returning();
        await this.audit.logAction({
            action: 'upsert',
            entity: 'performance_okr_company_policies',
            entityId: row.id,
            userId,
            details: `Upserted company policy for ${companyId}`,
            changes: dto,
        });
        return row;
    }
    async upsertTeamPolicy(companyId, groupId, userId, dto) {
        this.validatePolicyPatch(dto);
        const [grp] = await this.db
            .select({ id: schema_1.groups.id })
            .from(schema_1.groups)
            .where((0, drizzle_orm_1.eq)(schema_1.groups.id, groupId))
            .limit(1);
        if (!grp)
            throw new common_1.BadRequestException('Group not found');
        const now = new Date();
        const [row] = await this.db
            .insert(policies_and_checkins_schema_1.performanceOkrTeamPolicies)
            .values({ companyId, groupId, ...dto, updatedAt: now })
            .onConflictDoUpdate({
            target: [
                policies_and_checkins_schema_1.performanceOkrTeamPolicies.companyId,
                policies_and_checkins_schema_1.performanceOkrTeamPolicies.groupId,
            ],
            set: { ...dto, updatedAt: now },
        })
            .returning();
        await this.audit.logAction({
            action: 'upsert',
            entity: 'performance_okr_team_policies',
            entityId: row.id,
            userId,
            details: `Upserted team policy for group ${groupId}`,
            changes: dto,
        });
        return row;
    }
    async getEffectivePolicy(companyId, groupId) {
        const company = await this.getOrCreateCompanyPolicy(companyId);
        let team = null;
        if (groupId) {
            const [t] = await this.db
                .select()
                .from(policies_and_checkins_schema_1.performanceOkrTeamPolicies)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceOkrTeamPolicies.companyId, companyId), (0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceOkrTeamPolicies.groupId, groupId)))
                .limit(1);
            team = t ?? null;
        }
        const eff = {
            visibility: (team?.visibility ??
                company?.defaultVisibility ??
                SYSTEM_POLICY_DEFAULTS.visibility),
            cadence: (team?.cadence ??
                company?.defaultCadence ??
                SYSTEM_POLICY_DEFAULTS.cadence),
            timezone: (team?.timezone ??
                company?.defaultTimezone ??
                SYSTEM_POLICY_DEFAULTS.timezone) ||
                null,
            anchorDow: team?.anchorDow ??
                company?.defaultAnchorDow ??
                SYSTEM_POLICY_DEFAULTS.anchorDow,
            anchorHour: team?.anchorHour ??
                company?.defaultAnchorHour ??
                SYSTEM_POLICY_DEFAULTS.anchorHour,
            defaultOwnerIsLead: team?.defaultOwnerIsLead ?? SYSTEM_POLICY_DEFAULTS.defaultOwnerIsLead,
            _source: {
                visibility: team?.visibility
                    ? 'team'
                    : company?.defaultVisibility
                        ? 'company'
                        : 'system',
                cadence: team?.cadence
                    ? 'team'
                    : company?.defaultCadence
                        ? 'company'
                        : 'system',
                timezone: team?.timezone
                    ? 'team'
                    : company?.defaultTimezone
                        ? 'company'
                        : 'system',
                anchorDow: team?.anchorDow
                    ? 'team'
                    : company?.defaultAnchorDow
                        ? 'company'
                        : 'system',
                anchorHour: team?.anchorHour
                    ? 'team'
                    : company?.defaultAnchorHour
                        ? 'company'
                        : 'system',
                defaultOwnerIsLead: team?.defaultOwnerIsLead !== undefined ? 'team' : 'system',
            },
        };
        this.assertBounds(eff.anchorDow, 1, 7, 'anchorDow');
        this.assertBounds(eff.anchorHour, 0, 23, 'anchorHour');
        return eff;
    }
    async upsertObjectiveScheduleFromPolicy(objectiveId, companyId, groupId, overrides) {
        const [obj] = await this.db
            .select({ id: performance_objectives_schema_1.objectives.id })
            .from(performance_objectives_schema_1.objectives)
            .where((0, drizzle_orm_1.eq)(performance_objectives_schema_1.objectives.id, objectiveId))
            .limit(1);
        if (!obj)
            throw new common_1.BadRequestException('Objective not found');
        const eff = await this.getEffectivePolicy(companyId, groupId);
        const cadence = overrides?.cadence ?? eff.cadence;
        const timezone = overrides?.timezone ?? eff.timezone;
        const anchorDow = overrides?.anchorDow ?? eff.anchorDow;
        const anchorHour = overrides?.anchorHour ?? eff.anchorHour;
        const nextDueAt = this.computeNextDueAt(new Date(), cadence, anchorDow, anchorHour);
        const [existing] = await this.db
            .select()
            .from(policies_and_checkins_schema_1.performanceCheckinSchedules)
            .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceCheckinSchedules.objectiveId, objectiveId))
            .limit(1);
        if (existing) {
            const [updated] = await this.db
                .update(policies_and_checkins_schema_1.performanceCheckinSchedules)
                .set({
                frequency: cadence,
                timezone,
                anchorDow,
                anchorHour,
                nextDueAt,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(policies_and_checkins_schema_1.performanceCheckinSchedules.id, existing.id))
                .returning();
            return updated;
        }
        const [created] = await this.db
            .insert(policies_and_checkins_schema_1.performanceCheckinSchedules)
            .values({
            objectiveId,
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
    async resolveOwnerFromTeamLead(groupId) {
        if (!groupId)
            return null;
        const [lead] = await this.db
            .select({ employeeId: schema_1.groupMemberships.employeeId })
            .from(schema_1.groupMemberships)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groupMemberships.groupId, groupId), (0, drizzle_orm_1.eq)(schema_1.groupMemberships.role, 'lead'), (0, drizzle_orm_1.sql) `${schema_1.groupMemberships.endDate} IS NULL`))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.groupMemberships.joinedAt} DESC`)
            .limit(1);
        return lead?.employeeId ?? null;
    }
    validatePolicyPatch(dto) {
        if (dto.defaultAnchorDow !== undefined)
            this.assertBounds(dto.defaultAnchorDow, 1, 7, 'defaultAnchorDow');
        if (dto.defaultAnchorHour !== undefined)
            this.assertBounds(dto.defaultAnchorHour, 0, 23, 'defaultAnchorHour');
        if (dto.anchorDow !== undefined)
            this.assertBounds(dto.anchorDow, 1, 7, 'anchorDow');
        if (dto.anchorHour !== undefined)
            this.assertBounds(dto.anchorHour, 0, 23, 'anchorHour');
        if (dto.defaultCadence &&
            !['weekly', 'biweekly', 'monthly'].includes(dto.defaultCadence))
            throw new common_1.BadRequestException('defaultCadence must be weekly|biweekly|monthly');
        if (dto.cadence && !['weekly', 'biweekly', 'monthly'].includes(dto.cadence))
            throw new common_1.BadRequestException('cadence must be weekly|biweekly|monthly');
    }
    assertBounds(n, min, max, field) {
        if (typeof n !== 'number' || n < min || n > max) {
            throw new common_1.BadRequestException(`${field} must be between ${min} and ${max}`);
        }
    }
    computeNextDueAt(from, cadence, anchorDow, anchorHour) {
        const now = new Date(from);
        const result = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), anchorHour, 0, 0, 0));
        const targetJs = anchorDow % 7 === 0 ? 0 : anchorDow % 7;
        const currentJs = result.getUTCDay();
        let addDays = (targetJs - currentJs + 7) % 7;
        if (addDays === 0 && result <= now)
            addDays = 7;
        result.setUTCDate(result.getUTCDate() + addDays);
        if (cadence === 'biweekly') {
            return result;
        }
        if (cadence === 'monthly') {
            result.setUTCDate(result.getUTCDate() + 28);
            return result;
        }
        return result;
    }
};
exports.PolicyService = PolicyService;
exports.PolicyService = PolicyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService])
], PolicyService);
//# sourceMappingURL=goal-policy.service.js.map