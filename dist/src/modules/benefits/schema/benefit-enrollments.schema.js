"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benefitEnrollments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const benefit_plan_schema_1 = require("./benefit-plan.schema");
const schema_1 = require("../../../drizzle/schema");
exports.benefitEnrollments = (0, pg_core_1.pgTable)('benefit_enrollments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    benefitPlanId: (0, pg_core_1.uuid)('benefit_plan_id')
        .notNull()
        .references(() => benefit_plan_schema_1.benefitPlans.id),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id),
    selectedCoverage: (0, pg_core_1.text)('selected_coverage').notNull(),
    enrolledAt: (0, pg_core_1.timestamp)('enrolled_at').defaultNow(),
    isOptedOut: (0, pg_core_1.boolean)('is_opted_out').default(false),
}, (t) => [
    (0, pg_core_1.index)('benefit_enrollments_benefit_plan_id_idx').on(t.benefitPlanId),
    (0, pg_core_1.index)('benefit_enrollments_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('benefit_enrollments_enrolled_at_idx').on(t.enrolledAt),
]);
//# sourceMappingURL=benefit-enrollments.schema.js.map