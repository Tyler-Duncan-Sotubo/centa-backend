"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceCheckinSchedules = exports.performanceOkrTeamPolicies = exports.performanceOkrCompanyPolicies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../../drizzle/schema");
const performance_key_results_schema_1 = require("./performance-key-results.schema");
const performance_objectives_schema_1 = require("./performance-objectives.schema");
const goal_enums_schema_1 = require("./goal.enums.schema");
exports.performanceOkrCompanyPolicies = (0, pg_core_1.pgTable)('performance_okr_company_policies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    defaultVisibility: (0, goal_enums_schema_1.performanceVisibilityEnum)('default_visibility')
        .notNull()
        .default('company'),
    defaultCadence: (0, goal_enums_schema_1.performanceCadenceEnum)('default_cadence')
        .notNull()
        .default('monthly'),
    defaultTimezone: (0, pg_core_1.varchar)('default_timezone', { length: 64 }),
    defaultAnchorDow: (0, pg_core_1.integer)('default_anchor_dow'),
    defaultAnchorHour: (0, pg_core_1.integer)('default_anchor_hour'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_performance_okr_company_policies_company').on(t.companyId),
    (0, pg_core_1.uniqueIndex)('uniq_performance_okr_company_policy_per_company').on(t.companyId),
]);
exports.performanceOkrTeamPolicies = (0, pg_core_1.pgTable)('performance_okr_team_policies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    groupId: (0, pg_core_1.uuid)('group_id')
        .notNull()
        .references(() => schema_1.groups.id, { onDelete: 'cascade' }),
    visibility: (0, goal_enums_schema_1.performanceVisibilityEnum)('visibility'),
    cadence: (0, goal_enums_schema_1.performanceCadenceEnum)('cadence'),
    defaultOwnerIsLead: (0, pg_core_1.boolean)('default_owner_is_lead').default(true),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 64 }),
    anchorDow: (0, pg_core_1.integer)('anchor_dow'),
    anchorHour: (0, pg_core_1.integer)('anchor_hour'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_performance_okr_team_policies_company_group').on(t.companyId, t.groupId),
    (0, pg_core_1.uniqueIndex)('uniq_performance_okr_team_policy_per_group').on(t.companyId, t.groupId),
]);
exports.performanceCheckinSchedules = (0, pg_core_1.pgTable)('performance_checkin_schedules', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    objectiveId: (0, pg_core_1.uuid)('objective_id').references(() => performance_objectives_schema_1.objectives.id, {
        onDelete: 'cascade',
    }),
    keyResultId: (0, pg_core_1.uuid)('key_result_id').references(() => performance_key_results_schema_1.keyResults.id, {
        onDelete: 'cascade',
    }),
    frequency: (0, goal_enums_schema_1.performanceCadenceEnum)('frequency').notNull(),
    nextDueAt: (0, pg_core_1.timestamp)('next_due_at').notNull(),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 64 }),
    anchorDow: (0, pg_core_1.integer)('anchor_dow'),
    anchorHour: (0, pg_core_1.integer)('anchor_hour'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_performance_checkins_due').on(t.nextDueAt),
    (0, pg_core_1.index)('idx_performance_checkins_objective').on(t.objectiveId),
    (0, pg_core_1.index)('idx_performance_checkins_kr').on(t.keyResultId),
    (0, pg_core_1.uniqueIndex)('uniq_performance_checkin_per_objective')
        .on(t.objectiveId)
        .where((0, drizzle_orm_1.sql) `${t.objectiveId} IS NOT NULL`),
    (0, pg_core_1.uniqueIndex)('uniq_performance_checkin_per_kr')
        .on(t.keyResultId)
        .where((0, drizzle_orm_1.sql) `${t.keyResultId} IS NOT NULL`),
]);
//# sourceMappingURL=policies-and-checkins.schema.js.map