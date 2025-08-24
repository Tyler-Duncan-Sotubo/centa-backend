"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceGoalCheckinSchedules = exports.performanceGoalCompanyPolicies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_goals_schema_1 = require("./performance-goals.schema");
const goal_enums_schema_1 = require("./goal.enums.schema");
exports.performanceGoalCompanyPolicies = (0, pg_core_1.pgTable)('performance_goal_company_policies', {
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
    (0, pg_core_1.index)('idx_goal_company_policies_company').on(t.companyId),
    (0, pg_core_1.uniqueIndex)('uniq_goal_company_policy_per_company').on(t.companyId),
]);
exports.performanceGoalCheckinSchedules = (0, pg_core_1.pgTable)('performance_goal_checkin_schedules', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    goalId: (0, pg_core_1.uuid)('goal_id')
        .notNull()
        .references(() => performance_goals_schema_1.performanceGoals.id, { onDelete: 'cascade' }),
    frequency: (0, goal_enums_schema_1.performanceCadenceEnum)('frequency').notNull(),
    nextDueAt: (0, pg_core_1.timestamp)('next_due_at', { withTimezone: true }).notNull(),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 64 }),
    anchorDow: (0, pg_core_1.integer)('anchor_dow'),
    anchorHour: (0, pg_core_1.integer)('anchor_hour'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_goal_checkins_due').on(t.nextDueAt),
    (0, pg_core_1.index)('idx_goal_checkins_goal').on(t.goalId),
    (0, pg_core_1.uniqueIndex)('uniq_goal_checkin_per_goal').on(t.goalId),
]);
//# sourceMappingURL=policies-and-checkins.schema.js.map