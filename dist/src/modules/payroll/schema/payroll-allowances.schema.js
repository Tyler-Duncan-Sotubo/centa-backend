"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollAllowances = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.payrollAllowances = (0, pg_core_1.pgTable)('payroll_allowances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payrollId: (0, pg_core_1.uuid)('payroll_run_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    allowance_type: (0, pg_core_1.text)('allowance_type').notNull(),
    allowanceAmount: (0, pg_core_1.decimal)('allowance_amount', {
        precision: 10,
        scale: 2,
    }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('payroll_allowances_payroll_id_idx').on(t.payrollId),
    (0, pg_core_1.index)('payroll_allowances_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('payroll_allowances_allowance_type_idx').on(t.allowance_type),
    (0, pg_core_1.index)('payroll_allowances_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=payroll-allowances.schema.js.map