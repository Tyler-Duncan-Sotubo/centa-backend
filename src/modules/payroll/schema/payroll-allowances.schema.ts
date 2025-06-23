import {
  decimal,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from 'src/drizzle/schema';

export const payrollAllowances = pgTable(
  'payroll_allowances',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payrollId: uuid('payroll_run_id').notNull(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    allowance_type: text('allowance_type').notNull(), // "utility", "education", etc.
    allowanceAmount: decimal('allowance_amount', {
      precision: 10,
      scale: 2,
    }).notNull(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('payroll_allowances_payroll_id_idx').on(t.payrollId),
    index('payroll_allowances_employee_id_idx').on(t.employeeId),
    index('payroll_allowances_allowance_type_idx').on(t.allowance_type),
    index('payroll_allowances_created_at_idx').on(t.createdAt),
  ],
);
