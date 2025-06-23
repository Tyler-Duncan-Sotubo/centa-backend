"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollYtd = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const payroll_run_schema_1 = require("./payroll-run.schema");
exports.payrollYtd = (0, pg_core_1.pgTable)('payroll_ytd', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payrollId: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => payroll_run_schema_1.payroll.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    payrollMonth: (0, pg_core_1.text)('payroll_month').notNull(),
    payrollDate: (0, pg_core_1.text)('payroll_date').notNull(),
    year: (0, pg_core_1.integer)('year').notNull(),
    grossSalary: (0, pg_core_1.decimal)('gross_salary', { precision: 15, scale: 2 }).notNull(),
    basic: (0, pg_core_1.decimal)('basic_salary', { precision: 15, scale: 2 }).notNull(),
    housing: (0, pg_core_1.decimal)('housing_allowance', {
        precision: 15,
        scale: 2,
    }).notNull(),
    transport: (0, pg_core_1.decimal)('transport_allowance', {
        precision: 15,
        scale: 2,
    }).notNull(),
    totalDeductions: (0, pg_core_1.decimal)('total_deductions', {
        precision: 15,
        scale: 2,
    }).notNull(),
    bonuses: (0, pg_core_1.decimal)('bonuses', { precision: 15, scale: 2 }).default('0.00'),
    netSalary: (0, pg_core_1.decimal)('net_salary', { precision: 15, scale: 2 }).notNull(),
    PAYE: (0, pg_core_1.decimal)('paye', { precision: 15, scale: 2 }).notNull(),
    pension: (0, pg_core_1.decimal)('pension', { precision: 15, scale: 2 }).notNull(),
    employerPension: (0, pg_core_1.decimal)('employer_pension', {
        precision: 15,
        scale: 2,
    }).notNull(),
    nhf: (0, pg_core_1.decimal)('nhf', { precision: 15, scale: 2 }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_payroll_run_id_ytd_payroll').on(table.payrollId),
    (0, pg_core_1.index)('idx_employee_id_ytd_payroll').on(table.employeeId),
    (0, pg_core_1.index)('idx_payroll_month_ytd_payroll').on(table.payrollMonth),
    (0, pg_core_1.index)('idx_year_ytd_payroll').on(table.year),
]);
//# sourceMappingURL=payroll-ytd.schema.js.map