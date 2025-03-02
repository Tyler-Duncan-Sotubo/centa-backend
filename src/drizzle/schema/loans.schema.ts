import {
  pgTable,
  text,
  integer,
  timestamp,
  decimal,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';
import { companies } from './company.schema';
import { users } from './users.schema';

// Loans Table
export const salaryAdvance = pgTable(
  'salary_advance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    employee_id: uuid('employee_id')
      .references(() => employees.id)
      .notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    total_paid: decimal('total_paid', { precision: 10, scale: 2 })
      .default('0')
      .notNull(), // NEW FIELD

    tenureMonths: integer('tenure_months').notNull(),
    preferredMonthlyPayment: decimal('preferred_monthly_payment', {
      precision: 10,
      scale: 2,
    }),

    status: text('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_id_loans').on(table.company_id),
    index('idx_employee_id_loans').on(table.employee_id),
    index('idx_status_loans').on(table.status),
  ],
);

// Repayments Table
export const repayments = pgTable(
  'repayments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salary_advance_id: uuid('loan_id')
      .references(() => salaryAdvance.id)
      .notNull(),
    amount_paid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull(),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_loan_id_repayments').on(table.salary_advance_id),
    index('idx_paid_at_repayments').on(table.paidAt),
  ],
);

// Loan History Table
export const salaryAdvanceHistory = pgTable(
  'salary_advance_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    salaryAdvance_id: uuid('loan_id')
      .references(() => salaryAdvance.id)
      .notNull(),
    action: text('action').notNull(), // requested, approved, rejected
    reason: text('reason'),
    action_by: uuid('action_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_id_loan_history').on(table.company_id),
    index('idx_loan_id_loan_history').on(table.salaryAdvance_id),
    index('idx_action_loan_history').on(table.action),
    index('idx_created_at_loan_history').on(table.created_at),
  ],
);
