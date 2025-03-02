import { pgTable, text, integer, date, uuid } from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { companies } from './company.schema';

export const payroll = pgTable('payroll', {
  id: uuid('id').defaultRandom().primaryKey(),
  payroll_run_id: uuid('payroll_run_id').notNull(),
  gross_salary: integer('gross_salary').notNull(),
  paye_tax: integer('paye_tax').notNull(),
  pension_contribution: integer('pension_contribution').notNull(),
  employer_pension_contribution: integer(
    'employer_pension_contribution',
  ).notNull(),

  // Deductions
  nhf_contribution: integer('nhf_contribution').notNull(),
  bonuses: integer('bonuses').default(0),
  net_salary: integer('net_salary').notNull(),
  taxable_income: integer('taxable_income').notNull(),
  payroll_date: date('payroll_date').notNull(),
  payroll_month: text('payroll_month').notNull(),
  custom_deductions: integer('custom_deductions').default(0),
  total_deductions: integer('total_deductions').notNull(),
  salary_advance: integer('salary_advance').default(0),

  // Status
  payment_status: text('payment_status').default('pending'), // "pending", "paid"
  payment_date: date('payment_date'),
  payment_reference: text('payment_reference').default(''),
  approval_status: text('approval_status').default('pending'), // "pending", "approved", "rejected"
  approval_date: date('approval_date'),
  approval_remarks: text('approval_remarks').default(''),

  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
});

export const payslips = pgTable('payslips', {
  id: uuid('id').defaultRandom().primaryKey(),
  issued_at: date('issued_at').defaultNow(), // Timestamp for when the payslip is generated
  payroll_month: text('payroll_month').notNull(), // YYYY-MM format for tracking the payroll period
  slip_status: text('slip_status').default('issued'), // "issued", "pending", "reissued"
  employer_remarks: text('employer_remarks').default(''),
  pdf_url: text('pdf_url').default(''), // URL to the PDF file
  payroll_id: uuid('payroll_id')
    .notNull()
    .references(() => payroll.id, { onDelete: 'cascade' }),
  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
});

export const bonus = pgTable('bonuses', {
  id: uuid('id').defaultRandom().primaryKey(),
  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // Bonus amount
  bonus_type: text('bonus_type').default('performance'), // Bonus Type: "performance", "holiday", etc.
  bonus_date: date('bonus_date').notNull().defaultNow(),
  payroll_month: text('payroll_month').notNull(), // Track which payroll month this bonus belongs to
});

export const salaryBreakdown = pgTable('salary_breakdown', {
  id: uuid('id').defaultRandom().primaryKey(),

  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  basic: integer('basic').notNull(), // % of salary
  housing: integer('housing').notNull(),
  transport: integer('transport').notNull(),
  others: integer('others').notNull(),
});
