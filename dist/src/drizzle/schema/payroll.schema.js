"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ytdPayroll = exports.payGroups = exports.bonus = exports.payslips = exports.payrollAllowances = exports.payroll = exports.companyAllowances = exports.salaryBreakdown = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
const company_schema_1 = require("./company.schema");
exports.salaryBreakdown = (0, pg_core_1.pgTable)('salary_breakdown', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    basic: (0, pg_core_1.decimal)('basic', { precision: 5, scale: 2 }).notNull(),
    housing: (0, pg_core_1.decimal)('housing', { precision: 5, scale: 2 }).notNull(),
    transport: (0, pg_core_1.decimal)('transport', { precision: 5, scale: 2 }).notNull(),
    createdAt: (0, pg_core_1.date)('created_at').defaultNow(),
});
exports.companyAllowances = (0, pg_core_1.pgTable)('company_allowances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    allowance_type: (0, pg_core_1.text)('allowance_type').notNull(),
    allowance_percentage: (0, pg_core_1.decimal)('allowance_percentage', {
        precision: 5,
        scale: 2,
    }).notNull(),
    createdAt: (0, pg_core_1.date)('created_at').defaultNow(),
});
exports.payroll = (0, pg_core_1.pgTable)('payroll', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payroll_run_id: (0, pg_core_1.uuid)('payroll_run_id').notNull(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    basic: (0, pg_core_1.integer)('basic').notNull(),
    housing: (0, pg_core_1.integer)('housing').notNull(),
    transport: (0, pg_core_1.integer)('transport').notNull(),
    gross_salary: (0, pg_core_1.integer)('gross_salary').notNull(),
    pension_contribution: (0, pg_core_1.integer)('pension_contribution').notNull(),
    employer_pension_contribution: (0, pg_core_1.integer)('employer_pension_contribution').notNull(),
    salary_advance: (0, pg_core_1.integer)('salary_advance').default(0),
    bonuses: (0, pg_core_1.integer)('bonuses').default(0),
    nhf_enrolled: (0, pg_core_1.integer)('nhf_enrolled').default(0),
    nhf_contribution: (0, pg_core_1.integer)('nhf_contribution').default(0),
    paye_tax: (0, pg_core_1.integer)('paye_tax').notNull(),
    custom_deductions: (0, pg_core_1.integer)('custom_deductions').default(0),
    total_deductions: (0, pg_core_1.integer)('total_deductions').notNull(),
    net_salary: (0, pg_core_1.integer)('net_salary').notNull(),
    taxable_income: (0, pg_core_1.integer)('taxable_income').notNull(),
    payroll_date: (0, pg_core_1.date)('payroll_date').notNull(),
    payroll_month: (0, pg_core_1.text)('payroll_month').notNull(),
    payment_status: (0, pg_core_1.text)('payment_status').default('pending'),
    payment_date: (0, pg_core_1.date)('payment_date'),
    payment_reference: (0, pg_core_1.text)('payment_reference').default(''),
    approval_status: (0, pg_core_1.text)('approval_status').default('pending'),
    approval_date: (0, pg_core_1.date)('approval_date'),
    approval_remarks: (0, pg_core_1.text)('approval_remarks').default(''),
});
exports.payrollAllowances = (0, pg_core_1.pgTable)('payroll_allowances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payroll_id: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => exports.payroll.id, { onDelete: 'cascade' }),
    allowance_type: (0, pg_core_1.text)('allowance_type').notNull(),
    allowance_amount: (0, pg_core_1.integer)('allowance_amount').notNull(),
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
exports.payGroups = (0, pg_core_1.pgTable)('pay_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    apply_paye: (0, pg_core_1.boolean)('apply_paye').default(false),
    apply_pension: (0, pg_core_1.boolean)('apply_pension').default(false),
    apply_nhf: (0, pg_core_1.boolean)('apply_nhf').default(false),
    apply_additional: (0, pg_core_1.boolean)('apply_additional').default(false),
    is_demo: (0, pg_core_1.boolean)('is_demo').default(false),
    pay_schedule_id: (0, pg_core_1.uuid)('pay_schedule_id')
        .notNull()
        .references(() => company_schema_1.paySchedules.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
}, (table) => [
    (0, pg_core_1.index)('idx_name_employee_groups').on(table.name),
    (0, pg_core_1.index)('idx_company_id_employee_groups').on(table.company_id),
    (0, pg_core_1.index)('idx_pay_schedule_id_employee_groups').on(table.pay_schedule_id),
]);
exports.ytdPayroll = (0, pg_core_1.pgTable)('ytd_payroll', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payroll_id: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => exports.payroll.id, { onDelete: 'cascade' }),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    payroll_month: (0, pg_core_1.text)('payroll_month').notNull(),
    year: (0, pg_core_1.integer)('year').notNull(),
    gross_salary: (0, pg_core_1.integer)('gross_salary').notNull(),
    total_deductions: (0, pg_core_1.integer)('total_deductions').notNull(),
    bonuses: (0, pg_core_1.integer)('bonuses').default(0),
    net_salary: (0, pg_core_1.integer)('net_salary').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_payroll_run_id_ytd_payroll').on(table.payroll_id),
    (0, pg_core_1.index)('idx_employee_id_ytd_payroll').on(table.employee_id),
    (0, pg_core_1.index)('idx_payroll_month_ytd_payroll').on(table.payroll_month),
    (0, pg_core_1.index)('idx_year_ytd_payroll').on(table.year),
]);
//# sourceMappingURL=payroll.schema.js.map