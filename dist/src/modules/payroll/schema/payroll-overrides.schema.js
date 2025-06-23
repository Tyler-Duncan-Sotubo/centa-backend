"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollOverrides = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.payrollOverrides = (0, pg_core_1.pgTable)('payroll_overrides', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    payrollDate: (0, pg_core_1.date)('payroll_date').notNull(),
    forceInclude: (0, pg_core_1.boolean)('force_include').default(false),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.date)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('payroll_overrides_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('payroll_overrides_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('payroll_overrides_payroll_date_idx').on(t.payrollDate),
    (0, pg_core_1.index)('payroll_overrides_force_include_idx').on(t.forceInclude),
    (0, pg_core_1.index)('payroll_overrides_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=payroll-overrides.schema.js.map