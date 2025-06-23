import {
  bigint,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees, users } from 'src/drizzle/schema';

export const payrollDeductions = pgTable(
  'payroll_deductions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    amount: bigint('amount', { mode: 'number' }).notNull(),
    reason: text('reason').notNull(), // 'Salary Advance', 'Union Dues', etc.
    effectiveDate: text('effective_date').notNull(),
    status: text('status').default('active'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('payroll_deductions_company_id_idx').on(t.companyId),
    index('payroll_deductions_employee_id_idx').on(t.employeeId),
    index('payroll_deductions_created_by_idx').on(t.createdBy),
    index('payroll_deductions_effective_date_idx').on(t.effectiveDate),
    index('payroll_deductions_status_idx').on(t.status),
    index('payroll_deductions_created_at_idx').on(t.createdAt),
  ],
);
