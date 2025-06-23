import {
  bigint,
  boolean,
  date,
  pgTable,
  text,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees, users } from 'src/drizzle/schema';

export const payrollAdjustments = pgTable(
  'payroll_adjustments',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    payrollDate: date('payroll_date').notNull(), // aligns to a specific payroll run

    amount: bigint('amount', { mode: 'number' }).notNull(),

    type: text('type').notNull(), // e.g. "overtime", "retro_pay", "reimbursement"
    label: text('label'), // optional human-readable label: "Overtime for March", etc.

    taxable: boolean('taxable').default(true),
    proratable: boolean('proratable').default(false),
    recurring: boolean('recurring').default(false),

    isDeleted: boolean('is_deleted').default(false),

    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: date('created_at').defaultNow(),
  },
  (t) => [
    index('payroll_adjustments_company_id_idx').on(t.companyId),
    index('payroll_adjustments_employee_id_idx').on(t.employeeId),
    index('payroll_adjustments_payroll_date_idx').on(t.payrollDate),
    index('payroll_adjustments_type_idx').on(t.type),
    index('payroll_adjustments_is_deleted_idx').on(t.isDeleted),
    index('payroll_adjustments_created_by_idx').on(t.createdBy),
    index('payroll_adjustments_created_at_idx').on(t.createdAt),
  ],
);
