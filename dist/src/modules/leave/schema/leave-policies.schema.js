"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leavePolicies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const leave_types_schema_1 = require("./leave-types.schema");
exports.leavePolicies = (0, pg_core_1.pgTable)('leave_policies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    leaveTypeId: (0, pg_core_1.uuid)('leave_type_id')
        .notNull()
        .references(() => leave_types_schema_1.leaveTypes.id, { onDelete: 'cascade' }),
    accrualEnabled: (0, pg_core_1.boolean)('accrual_enabled').default(false),
    accrualFrequency: (0, pg_core_1.varchar)('accrual_frequency', { length: 20 }),
    accrualAmount: (0, pg_core_1.decimal)('accrual_amount', { precision: 5, scale: 2 }),
    maxBalance: (0, pg_core_1.integer)('max_balance'),
    allowCarryover: (0, pg_core_1.boolean)('allow_carryover').default(false),
    carryoverLimit: (0, pg_core_1.integer)('carryover_limit'),
    onlyConfirmedEmployees: (0, pg_core_1.boolean)('only_confirmed_employees').default(false),
    genderEligibility: (0, pg_core_1.varchar)('gender_eligibility', { length: 10 }),
    manualEntitlement: (0, pg_core_1.integer)('manual_entitlement'),
    grantOnStart: (0, pg_core_1.boolean)('grant_on_start').default(true),
    eligibilityRules: (0, pg_core_1.jsonb)('eligibility_rules'),
    isSplittable: (0, pg_core_1.boolean)('is_splittable').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('leave_policies_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('leave_policies_leave_type_id_idx').on(t.leaveTypeId),
    (0, pg_core_1.index)('leave_policies_accrual_enabled_idx').on(t.accrualEnabled),
    (0, pg_core_1.index)('leave_policies_accrual_frequency_idx').on(t.accrualFrequency),
    (0, pg_core_1.index)('leave_policies_gender_eligibility_idx').on(t.genderEligibility),
    (0, pg_core_1.index)('leave_policies_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=leave-policies.schema.js.map