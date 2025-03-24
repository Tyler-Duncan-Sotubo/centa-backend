import {
  pgTable,
  text,
  integer,
  date,
  uuid,
  index,
  boolean,
  timestamp,
  decimal,
} from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { companies, paySchedules } from './company.schema';

export const salaryBreakdown = pgTable('salary_breakdown', {
  id: uuid('id').defaultRandom().primaryKey(),

  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  // Core Salary Components (stored as percentage)
  basic: decimal('basic', { precision: 5, scale: 2 }).notNull(),
  housing: decimal('housing', { precision: 5, scale: 2 }).notNull(),
  transport: decimal('transport', { precision: 5, scale: 2 }).notNull(),

  createdAt: date('created_at').defaultNow(),
});

// COMPANY ALLOWANCES
export const companyAllowances = pgTable('company_allowances', {
  id: uuid('id').defaultRandom().primaryKey(),

  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  allowance_type: text('allowance_type').notNull(), // e.g., "furniture", "utility", "education"
  allowance_percentage: decimal('allowance_percentage', {
    precision: 5,
    scale: 2,
  }).notNull(),

  createdAt: date('created_at').defaultNow(),
});

export const payroll = pgTable('payroll', {
  id: uuid('id').defaultRandom().primaryKey(),
  payroll_run_id: uuid('payroll_run_id').notNull(),

  employee_id: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  company_id: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  // Core Salary Components
  basic: integer('basic').notNull(),
  housing: integer('housing').notNull(),
  transport: integer('transport').notNull(),

  // Derived Salary Component
  gross_salary: integer('gross_salary').notNull(), // BHT + total_allowances

  // Pension (Based on BHT)
  pension_contribution: integer('pension_contribution').notNull(),
  employer_pension_contribution: integer(
    'employer_pension_contribution',
  ).notNull(),

  // Salary Advance
  salary_advance: integer('salary_advance').default(0),

  // Bonuses
  bonuses: integer('bonuses').default(0),

  // Deductions
  nhf_enrolled: integer('nhf_enrolled').default(0),
  nhf_contribution: integer('nhf_contribution').default(0),
  paye_tax: integer('paye_tax').notNull(),
  custom_deductions: integer('custom_deductions').default(0),
  total_deductions: integer('total_deductions').notNull(),

  // Final Salary
  net_salary: integer('net_salary').notNull(),
  taxable_income: integer('taxable_income').notNull(),

  // Payroll Info
  payroll_date: date('payroll_date').notNull(),
  payroll_month: text('payroll_month').notNull(),

  // Status
  payment_status: text('payment_status').default('pending'),
  payment_date: date('payment_date'),
  payment_reference: text('payment_reference').default(''),
  approval_status: text('approval_status').default('pending'),
  approval_date: date('approval_date'),
  approval_remarks: text('approval_remarks').default(''),
});

// PAYROLL ALLOWANCES TABLE
export const payrollAllowances = pgTable('payroll_allowances', {
  id: uuid('id').defaultRandom().primaryKey(),

  payroll_id: uuid('payroll_id')
    .notNull()
    .references(() => payroll.id, { onDelete: 'cascade' }),

  allowance_type: text('allowance_type').notNull(), // "utility", "education", etc.
  allowance_amount: integer('allowance_amount').notNull(), // Actual monetary value for the allowance
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

export const payGroups = pgTable(
  'pay_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(),

    // Boolean flags that indicate whether a tax deduction applies
    apply_paye: boolean('apply_paye').default(false),
    apply_pension: boolean('apply_pension').default(false),
    apply_nhf: boolean('apply_nhf').default(false),
    apply_additional: boolean('apply_additional').default(false),
    is_demo: boolean('is_demo').default(false),

    // Pay Schedule Reference
    pay_schedule_id: uuid('pay_schedule_id')
      .notNull()
      .references(() => paySchedules.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_name_employee_groups').on(table.name),
    index('idx_company_id_employee_groups').on(table.company_id),
    index('idx_pay_schedule_id_employee_groups').on(table.pay_schedule_id),
  ],
);

export const ytdPayroll = pgTable(
  'ytd_payroll',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payroll_id: uuid('payroll_id')
      .notNull()
      .references(() => payroll.id, { onDelete: 'cascade' }),

    employee_id: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    payroll_month: text('payroll_month').notNull(), // e.g., "2024-03"
    year: integer('year').notNull(), // Store year separately for easier queries

    gross_salary: integer('gross_salary').notNull(),
    total_deductions: integer('total_deductions').notNull(),
    bonuses: integer('bonuses').default(0),
    net_salary: integer('net_salary').notNull(),

    created_at: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_payroll_run_id_ytd_payroll').on(table.payroll_id),
    index('idx_employee_id_ytd_payroll').on(table.employee_id),
    index('idx_payroll_month_ytd_payroll').on(table.payroll_month),
    index('idx_year_ytd_payroll').on(table.year),
  ],
);
