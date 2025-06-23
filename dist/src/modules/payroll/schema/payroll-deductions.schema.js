"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollDeductions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.payrollDeductions = (0, pg_core_1.pgTable)('payroll_deductions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .notNull()
        .references(() => schema_1.users.id),
    amount: (0, pg_core_1.bigint)('amount', { mode: 'number' }).notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(),
    effectiveDate: (0, pg_core_1.text)('effective_date').notNull(),
    status: (0, pg_core_1.text)('status').default('active'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('payroll_deductions_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('payroll_deductions_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('payroll_deductions_created_by_idx').on(t.createdBy),
    (0, pg_core_1.index)('payroll_deductions_effective_date_idx').on(t.effectiveDate),
    (0, pg_core_1.index)('payroll_deductions_status_idx').on(t.status),
    (0, pg_core_1.index)('payroll_deductions_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=payroll-deductions.schema.js.map