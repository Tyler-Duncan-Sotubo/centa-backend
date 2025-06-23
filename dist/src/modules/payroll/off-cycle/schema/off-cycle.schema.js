"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offCyclePayroll = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.offCyclePayroll = (0, pg_core_1.pgTable)('off_cycle_payroll', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payrollRunId: (0, pg_core_1.uuid)('payroll_run_id').notNull(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 15, scale: 2 }).notNull(),
    taxable: (0, pg_core_1.boolean)('taxable').notNull().default(true),
    proratable: (0, pg_core_1.boolean)('proratable').notNull().default(false),
    notes: (0, pg_core_1.text)('notes'),
    payrollDate: (0, pg_core_1.date)('payroll_date').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_employee_id_off_cycle').on(table.employeeId),
    (0, pg_core_1.index)('idx_company_id_off_cycle').on(table.companyId),
    (0, pg_core_1.index)('idx_payroll_date_off_cycle').on(table.payrollDate),
]);
//# sourceMappingURL=off-cycle.schema.js.map