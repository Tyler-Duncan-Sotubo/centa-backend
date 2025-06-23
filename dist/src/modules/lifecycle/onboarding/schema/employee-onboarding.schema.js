"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeOnboarding = exports.onboardingStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../core/schema");
const onboarding_templates_schema_1 = require("./onboarding-templates.schema");
exports.onboardingStatusEnum = (0, pg_core_1.pgEnum)('onboarding_status', [
    'pending',
    'in_progress',
    'completed',
]);
exports.employeeOnboarding = (0, pg_core_1.pgTable)('employee_onboarding', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => onboarding_templates_schema_1.onboardingTemplates.id),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    status: (0, exports.onboardingStatusEnum)('status').default('pending'),
    startedAt: (0, pg_core_1.timestamp)('started_at'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_onboarding_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_onboarding_template_id_idx').on(t.templateId),
    (0, pg_core_1.index)('employee_onboarding_status_idx').on(t.status),
    (0, pg_core_1.index)('employee_onboarding_company_id_idx').on(t.companyId),
]);
//# sourceMappingURL=employee-onboarding.schema.js.map