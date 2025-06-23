"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollAdjustments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.payrollAdjustments = (0, pg_core_1.pgTable)('payroll_adjustments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    payrollDate: (0, pg_core_1.date)('payroll_date').notNull(),
    amount: (0, pg_core_1.bigint)('amount', { mode: 'number' }).notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    label: (0, pg_core_1.text)('label'),
    taxable: (0, pg_core_1.boolean)('taxable').default(true),
    proratable: (0, pg_core_1.boolean)('proratable').default(false),
    recurring: (0, pg_core_1.boolean)('recurring').default(false),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
    notes: (0, pg_core_1.text)('notes'),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => schema_1.users.id),
    createdAt: (0, pg_core_1.date)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('payroll_adjustments_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('payroll_adjustments_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('payroll_adjustments_payroll_date_idx').on(t.payrollDate),
    (0, pg_core_1.index)('payroll_adjustments_type_idx').on(t.type),
    (0, pg_core_1.index)('payroll_adjustments_is_deleted_idx').on(t.isDeleted),
    (0, pg_core_1.index)('payroll_adjustments_created_by_idx').on(t.createdBy),
    (0, pg_core_1.index)('payroll_adjustments_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=payroll-adjustments.schema.js.map