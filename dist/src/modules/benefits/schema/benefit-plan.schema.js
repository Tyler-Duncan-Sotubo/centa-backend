"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benefitPlans = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const benefit_groups_schema_1 = require("./benefit-groups.schema");
exports.benefitPlans = (0, pg_core_1.pgTable)('benefit_plans', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id),
    benefitGroupId: (0, pg_core_1.uuid)('benefit_group_id')
        .notNull()
        .references(() => benefit_groups_schema_1.benefitGroups.id),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    category: (0, pg_core_1.text)('category').notNull(),
    coverageOptions: (0, pg_core_1.jsonb)('coverage_options').notNull(),
    cost: (0, pg_core_1.jsonb)('cost').notNull(),
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }).notNull(),
    endDate: (0, pg_core_1.timestamp)('end_date', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    split: (0, pg_core_1.text)('split').notNull(),
    employerContribution: (0, pg_core_1.integer)('employer_contribution').default(0),
}, (t) => [
    (0, pg_core_1.index)('benefit_plans_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('benefit_plans_benefit_group_id_idx').on(t.benefitGroupId),
    (0, pg_core_1.index)('benefit_plans_name_idx').on(t.name),
    (0, pg_core_1.index)('benefit_plans_category_idx').on(t.category),
    (0, pg_core_1.index)('benefit_plans_start_date_idx').on(t.startDate),
    (0, pg_core_1.index)('benefit_plans_end_date_idx').on(t.endDate),
    (0, pg_core_1.index)('benefit_plans_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=benefit-plan.schema.js.map