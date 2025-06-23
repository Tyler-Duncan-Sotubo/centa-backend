import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
  decimal,
} from 'drizzle-orm/pg-core';
import { companies, employees, users } from 'src/drizzle/schema';

export const salaryAdvance = pgTable(
  'salary_advance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    loanNumber: text('loan_number'),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    employeeId: uuid('employee_id')
      .references(() => employees.id)
      .notNull(),

    name: text('name').notNull(),

    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    totalPaid: decimal('total_paid', { precision: 15, scale: 2 })
      .default('0.00')
      .notNull(),
    tenureMonths: integer('tenure_months').notNull(),
    preferredMonthlyPayment: decimal('preferred_monthly_payment', {
      precision: 15,
      scale: 2,
    }).default('0.00'),

    status: text('status').default('pending').notNull(),
    paymentStatus: text('payment_status').default('open').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_id_loans').on(table.companyId),
    index('idx_employee_id_loans').on(table.employeeId),
    index('idx_status_loans').on(table.status),
  ],
);

export const repayments = pgTable(
  'repayments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salaryAdvanceId: uuid('loan_id')
      .references(() => salaryAdvance.id)
      .notNull(),
    amountPaid: decimal('amount_paid', { precision: 15, scale: 2 }).notNull(),
    paidAt: timestamp('paid_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_loan_id_repayments').on(table.salaryAdvanceId),
    index('idx_paid_at_repayments').on(table.paidAt),
  ],
);

// Loan History Table
export const salaryAdvanceHistory = pgTable(
  'salary_advance_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    salaryAdvanceId: uuid('loan_id')
      .references(() => salaryAdvance.id)
      .notNull(),
    action: text('action').notNull(), // requested, approved, rejected
    reason: text('reason'),
    actionBy: uuid('action_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_company_id_loan_history').on(table.companyId),
    index('idx_loan_id_loan_history').on(table.salaryAdvanceId),
    index('idx_action_loan_history').on(table.action),
    index('idx_created_at_loan_history').on(table.createdAt),
  ],
);
