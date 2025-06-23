import {
  pgTable,
  uuid,
  text,
  decimal,
  boolean,
  date,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';

export const offCyclePayroll = pgTable(
  'off_cycle_payroll',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payrollRunId: uuid('payroll_run_id').notNull(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    type: text('type').notNull(), // e.g., severance, bonus, reimbursement
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),

    taxable: boolean('taxable').notNull().default(true),
    proratable: boolean('proratable').notNull().default(false),

    notes: text('notes'), // optional notes or comments

    payrollDate: date('payroll_date').notNull(), // when this payment should apply
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_employee_id_off_cycle').on(table.employeeId),
    index('idx_company_id_off_cycle').on(table.companyId),
    index('idx_payroll_date_off_cycle').on(table.payrollDate),
  ],
);
