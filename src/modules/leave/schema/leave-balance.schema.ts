import {
  pgTable,
  uuid,
  integer,
  timestamp,
  decimal,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';
import { leaveTypes } from './leave-types.schema';

export const leaveBalances = pgTable(
  'leave_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    leaveTypeId: uuid('leave_type_id')
      .notNull()
      .references(() => leaveTypes.id, { onDelete: 'cascade' }),

    year: integer('year').notNull(), // e.g. 2025

    entitlement: decimal('entitlement', { precision: 5, scale: 2 })
      .notNull()
      .default('0.00'), // Total awarded leave days

    used: decimal('used', { precision: 5, scale: 2 }).notNull().default('0.00'), // Approved leave days

    balance: decimal('balance', { precision: 5, scale: 2 })
      .notNull()
      .default('0.00'), // Cached balance (entitlement - used)

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    unique('unique_leave_balance').on(t.employeeId, t.leaveTypeId, t.year),
    index('leave_balances_company_id_idx').on(t.companyId),
    index('leave_balances_employee_id_idx').on(t.employeeId),
    index('leave_balances_leave_type_id_idx').on(t.leaveTypeId),
    index('leave_balances_year_idx').on(t.year),
  ],
);
