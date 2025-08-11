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
exports.FeedbackSettingsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const performance_feedback_settings_schema_1 = require("../schema/performance-feedback-settings.schema");
const audit_service_1 = require("../../../audit/audit.service");
const performance_feedback_rules_scopes_schema_1 = require("../schema/performance-feedback-rules-scopes.schema");
const performance_feedback_rules_schema_1 = require("../schema/performance-feedback-rules.schema");
const schema_1 = require("../../../../drizzle/schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
let FeedbackSettingsService = class FeedbackSettingsService {
    constructor(db, auditService, cache) {
        this.db = db;
        this.auditService = auditService;
        this.cache = cache;
    }
    kSettings(companyId) {
        return `fs:settings:${companyId}`;
    }
    kRules(companyId) {
        return `fs:rules:${companyId}`;
    }
    async burst(companyId) {
        await Promise.allSettled([
            this.cache.del(this.kSettings(companyId)),
            this.cache.del(this.kRules(companyId)),
        ]);
    }
    async create(companyId) {
        const [exists] = await this.db
            .select({ id: performance_feedback_settings_schema_1.feedbackSettings.id })
            .from(performance_feedback_settings_schema_1.feedbackSettings)
            .where((0, drizzle_orm_1.eq)(performance_feedback_settings_schema_1.feedbackSettings.companyId, companyId));
        if (exists) {
            return await this.findOne(companyId);
        }
        const now = new Date();
        const defaultRules = [
            {
                group: 'employee',
                type: 'self',
                enabled: true,
                scope: {
                    officeOnly: false,
                    departmentOnly: false,
                    offices: [],
                    departments: [],
                },
            },
            {
                group: 'employee',
                type: 'peer',
                enabled: true,
                scope: {
                    officeOnly: true,
                    departmentOnly: false,
                    offices: [],
                    departments: [],
                },
            },
            {
                group: 'employee',
                type: 'employee_to_manager',
                enabled: true,
                scope: {
                    officeOnly: false,
                    departmentOnly: true,
                    offices: [],
                    departments: [],
                },
            },
            {
                group: 'manager',
                type: 'self',
                enabled: true,
                scope: {
                    officeOnly: false,
                    departmentOnly: false,
                    offices: [],
                    departments: [],
                },
            },
            {
                group: 'manager',
                type: 'peer',
                enabled: true,
                scope: {
                    officeOnly: false,
                    departmentOnly: false,
                    offices: [],
                    departments: [],
                },
            },
            {
                group: 'manager',
                type: 'employee_to_manager',
                enabled: true,
                scope: {
                    officeOnly: false,
                    departmentOnly: true,
                    offices: [],
                    departments: [],
                },
            },
            {
                group: 'manager',
                type: 'manager_to_employee',
                enabled: false,
                scope: {
                    officeOnly: false,
                    departmentOnly: false,
                    offices: [],
                    departments: [],
                },
            },
        ];
        const created = await this.db.transaction(async (trx) => {
            const [settings] = await trx
                .insert(performance_feedback_settings_schema_1.feedbackSettings)
                .values({
                companyId,
                enableEmployeeFeedback: true,
                enableManagerFeedback: true,
                allowAnonymous: true,
                createdAt: now,
                updatedAt: now,
            })
                .returning();
            for (const rule of defaultRules) {
                const [insertedRule] = await trx
                    .insert(performance_feedback_rules_schema_1.feedbackRules)
                    .values({
                    companyId,
                    group: rule.group,
                    type: rule.type,
                    enabled: rule.enabled,
                    officeOnly: rule.scope.officeOnly,
                    departmentOnly: rule.scope.departmentOnly,
                    createdAt: now,
                    updatedAt: now,
                })
                    .returning();
                const scopeEntries = [
                    ...rule.scope.offices.map((id) => ({
                        ruleId: insertedRule.id,
                        type: 'office',
                        referenceId: id,
                        createdAt: now,
                    })),
                    ...rule.scope.departments.map((id) => ({
                        ruleId: insertedRule.id,
                        type: 'department',
                        referenceId: id,
                        createdAt: now,
                    })),
                ];
                if (scopeEntries.length) {
                    await trx.insert(performance_feedback_rules_scopes_schema_1.feedbackRuleScopes).values(scopeEntries);
                }
            }
            return settings;
        });
        await this.burst(companyId);
        return created;
    }
    async seedCompanies() {
        const allCompanies = await this.db
            .select({ id: schema_1.companies.id })
            .from(schema_1.companies)
            .execute();
        for (const company of allCompanies) {
            await this.create(company.id);
        }
    }
    async findOne(companyId) {
        const settingsKey = this.kSettings(companyId);
        const rulesKey = this.kRules(companyId);
        const settings = await this.cache.getOrSetCache(settingsKey, async () => {
            const [row] = await this.db
                .select()
                .from(performance_feedback_settings_schema_1.feedbackSettings)
                .where((0, drizzle_orm_1.eq)(performance_feedback_settings_schema_1.feedbackSettings.companyId, companyId));
            return row ?? null;
        });
        if (!settings) {
            return {};
        }
        const rules = await this.cache.getOrSetCache(rulesKey, async () => {
            const r = await this.db
                .select()
                .from(performance_feedback_rules_schema_1.feedbackRules)
                .where((0, drizzle_orm_1.eq)(performance_feedback_rules_schema_1.feedbackRules.companyId, companyId));
            const ruleIds = r.map((x) => x.id);
            const s = ruleIds.length
                ? await this.db
                    .select()
                    .from(performance_feedback_rules_scopes_schema_1.feedbackRuleScopes)
                    .where((0, drizzle_orm_1.inArray)(performance_feedback_rules_scopes_schema_1.feedbackRuleScopes.ruleId, ruleIds))
                : [];
            return { rules: r, scopes: s };
        });
        const feedbackRulesByGroup = {
            employee: [],
            manager: [],
        };
        for (const rule of rules.rules) {
            const ruleScopes = rules.scopes.filter((s) => s.ruleId === rule.id);
            const offices = ruleScopes
                .filter((s) => s.type === 'office')
                .map((s) => s.referenceId);
            const departments = ruleScopes
                .filter((s) => s.type === 'department')
                .map((s) => s.referenceId);
            feedbackRulesByGroup[rule.group].push({
                type: rule.type,
                enabled: rule.enabled,
                scope: {
                    officeOnly: rule.officeOnly,
                    departmentOnly: rule.departmentOnly,
                    offices,
                    departments,
                },
            });
        }
        return {
            id: settings.id,
            companyId: settings.companyId,
            enableEmployeeFeedback: settings.enableEmployeeFeedback,
            enableManagerFeedback: settings.enableManagerFeedback,
            allowAnonymous: settings.allowAnonymous,
            createdAt: settings.createdAt,
            updatedAt: settings.updatedAt,
            rules: feedbackRulesByGroup,
        };
    }
    async update(companyId, dto, user) {
        const [existing] = await this.db
            .select()
            .from(performance_feedback_settings_schema_1.feedbackSettings)
            .where((0, drizzle_orm_1.eq)(performance_feedback_settings_schema_1.feedbackSettings.companyId, companyId));
        if (!existing)
            throw new common_1.NotFoundException('Feedback settings not found');
        const [updated] = await this.db
            .update(performance_feedback_settings_schema_1.feedbackSettings)
            .set({ ...dto, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(performance_feedback_settings_schema_1.feedbackSettings.companyId, companyId))
            .returning();
        await this.auditService.logAction({
            action: 'update',
            entity: 'feedbackSettings',
            entityId: updated.id,
            userId: user.id,
            details: 'Updated feedback configuration settings',
            changes: dto,
        });
        await this.burst(companyId);
        return updated;
    }
    async updateSingleRule(companyId, dto, user) {
        const { group, type, enabled, scope } = dto;
        const [existing] = await this.db
            .select()
            .from(performance_feedback_settings_schema_1.feedbackSettings)
            .where((0, drizzle_orm_1.eq)(performance_feedback_settings_schema_1.feedbackSettings.companyId, companyId));
        if (!existing)
            throw new common_1.NotFoundException('Feedback settings not found');
        const now = new Date();
        await this.db.transaction(async (trx) => {
            const [rule] = await trx
                .select()
                .from(performance_feedback_rules_schema_1.feedbackRules)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(performance_feedback_rules_schema_1.feedbackRules.companyId, companyId), (0, drizzle_orm_1.eq)(performance_feedback_rules_schema_1.feedbackRules.group, group), (0, drizzle_orm_1.eq)(performance_feedback_rules_schema_1.feedbackRules.type, type)));
            let ruleId = rule?.id;
            if (ruleId) {
                await trx
                    .update(performance_feedback_rules_schema_1.feedbackRules)
                    .set({
                    enabled,
                    officeOnly: scope?.officeOnly ?? false,
                    departmentOnly: scope?.departmentOnly ?? false,
                    updatedAt: now,
                })
                    .where((0, drizzle_orm_1.eq)(performance_feedback_rules_schema_1.feedbackRules.id, ruleId));
            }
            else {
                const [inserted] = await trx
                    .insert(performance_feedback_rules_schema_1.feedbackRules)
                    .values({
                    companyId,
                    group,
                    type,
                    enabled,
                    officeOnly: scope?.officeOnly ?? false,
                    departmentOnly: scope?.departmentOnly ?? false,
                    createdAt: now,
                    updatedAt: now,
                })
                    .returning();
                ruleId = inserted.id;
            }
            await trx
                .delete(performance_feedback_rules_scopes_schema_1.feedbackRuleScopes)
                .where((0, drizzle_orm_1.eq)(performance_feedback_rules_scopes_schema_1.feedbackRuleScopes.ruleId, ruleId));
            const entries = [];
            for (const officeId of scope?.offices || []) {
                entries.push({
                    ruleId: ruleId,
                    type: 'office',
                    referenceId: officeId,
                    createdAt: now,
                });
            }
            for (const deptId of scope?.departments || []) {
                entries.push({
                    ruleId: ruleId,
                    type: 'department',
                    referenceId: deptId,
                    createdAt: now,
                });
            }
            if (entries.length)
                await trx.insert(performance_feedback_rules_scopes_schema_1.feedbackRuleScopes).values(entries);
        });
        await this.auditService.logAction({
            action: 'update',
            entity: 'feedbackRule',
            entityId: `${companyId}:${group}.${type}`,
            userId: user.id,
            details: `Updated feedback rule for ${group}.${type}`,
            changes: { enabled, scope },
        });
        await this.burst(companyId);
        return { success: true };
    }
};
exports.FeedbackSettingsService = FeedbackSettingsService;
exports.FeedbackSettingsService = FeedbackSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        cache_service_1.CacheService])
], FeedbackSettingsService);
//# sourceMappingURL=feedback-settings.service.js.map