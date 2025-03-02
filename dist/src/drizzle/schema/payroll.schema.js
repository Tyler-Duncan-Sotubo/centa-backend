"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salaryBreakdown = exports.bonus = exports.payslips = exports.payroll = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
const company_schema_1 = require("./company.schema");
exports.payroll = (0, pg_core_1.pgTable)('payroll', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payroll_run_id: (0, pg_core_1.uuid)('payroll_run_id').notNull(),
    gross_salary: (0, pg_core_1.integer)('gross_salary').notNull(),
    paye_tax: (0, pg_core_1.integer)('paye_tax').notNull(),
    pension_contribution: (0, pg_core_1.integer)('pension_contribution').notNull(),
    employer_pension_contribution: (0, pg_core_1.integer)('employer_pension_contribution').notNull(),
    nhf_contribution: (0, pg_core_1.integer)('nhf_contribution').notNull(),
    bonuses: (0, pg_core_1.integer)('bonuses').default(0),
    net_salary: (0, pg_core_1.integer)('net_salary').notNull(),
    taxable_income: (0, pg_core_1.integer)('taxable_income').notNull(),
    payroll_date: (0, pg_core_1.date)('payroll_date').notNull(),
    payroll_month: (0, pg_core_1.text)('payroll_month').notNull(),
    custom_deductions: (0, pg_core_1.integer)('custom_deductions').default(0),
    total_deductions: (0, pg_core_1.integer)('total_deductions').notNull(),
    salary_advance: (0, pg_core_1.integer)('salary_advance').default(0),
    payment_status: (0, pg_core_1.text)('payment_status').default('pending'),
    payment_date: (0, pg_core_1.date)('payment_date'),
    payment_reference: (0, pg_core_1.text)('payment_reference').default(''),
    approval_status: (0, pg_core_1.text)('approval_status').default('pending'),
    approval_date: (0, pg_core_1.date)('approval_date'),
    approval_remarks: (0, pg_core_1.text)('approval_remarks').default(''),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
});
exports.payslips = (0, pg_core_1.pgTable)('payslips', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    issued_at: (0, pg_core_1.date)('issued_at').defaultNow(),
    payroll_month: (0, pg_core_1.text)('payroll_month').notNull(),
    slip_status: (0, pg_core_1.text)('slip_status').default('issued'),
    employer_remarks: (0, pg_core_1.text)('employer_remarks').default(''),
    pdf_url: (0, pg_core_1.text)('pdf_url').default(''),
    payroll_id: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => exports.payroll.id, { onDelete: 'cascade' }),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
});
exports.bonus = (0, pg_core_1.pgTable)('bonuses', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    bonus_type: (0, pg_core_1.text)('bonus_type').default('performance'),
    bonus_date: (0, pg_core_1.date)('bonus_date').notNull().defaultNow(),
    payroll_month: (0, pg_core_1.text)('payroll_month').notNull(),
});
exports.salaryBreakdown = (0, pg_core_1.pgTable)('salary_breakdown', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    basic: (0, pg_core_1.integer)('basic').notNull(),
    housing: (0, pg_core_1.integer)('housing').notNull(),
    transport: (0, pg_core_1.integer)('transport').notNull(),
    others: (0, pg_core_1.integer)('others').notNull(),
});
//# sourceMappingURL=payroll.schema.js.map