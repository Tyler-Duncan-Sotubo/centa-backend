import {
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { employees, companies } from 'src/drizzle/schema';
import { payroll } from './payroll-run.schema';

export const payrollYtd = pgTable(
  'payroll_ytd',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payrollId: uuid('payroll_id')
      .notNull()
      .references(() => payroll.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    payrollMonth: text('payroll_month').notNull(),
    payrollDate: text('payroll_date').notNull(),
    year: integer('year').notNull(),

    // ⬇️ Decimal money fields
    grossSalary: decimal('gross_salary', { precision: 15, scale: 2 }).notNull(),

    basic: decimal('basic_salary', { precision: 15, scale: 2 }).notNull(),
    housing: decimal('housing_allowance', {
      precision: 15,
      scale: 2,
    }).notNull(),
    transport: decimal('transport_allowance', {
      precision: 15,
      scale: 2,
    }).notNull(),

    totalDeductions: decimal('total_deductions', {
      precision: 15,
      scale: 2,
    }).notNull(),
    bonuses: decimal('bonuses', { precision: 15, scale: 2 }).default('0.00'),
    netSalary: decimal('net_salary', { precision: 15, scale: 2 }).notNull(),

    PAYE: decimal('paye', { precision: 15, scale: 2 }).notNull(),
    pension: decimal('pension', { precision: 15, scale: 2 }).notNull(),
    employerPension: decimal('employer_pension', {
      precision: 15,
      scale: 2,
    }).notNull(),
    nhf: decimal('nhf', { precision: 15, scale: 2 }).notNull(),

    created_at: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('idx_payroll_run_id_ytd_payroll').on(table.payrollId),
    index('idx_employee_id_ytd_payroll').on(table.employeeId),
    index('idx_payroll_month_ytd_payroll').on(table.payrollMonth),
    index('idx_year_ytd_payroll').on(table.year),
  ],
);
