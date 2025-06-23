import {
  pgTable,
  text,
  decimal,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    date: text('date').notNull(),
    category: text('category').notNull(),
    purpose: text('purpose').notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    status: text('status').default('Requested').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    receiptUrl: text('receipt_url'),
    paymentMethod: text('payment_method'),
    rejectionReason: text('rejection_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('expenses_company_id_idx').on(t.companyId),
    index('expenses_employee_id_idx').on(t.employeeId),
    index('expenses_date_idx').on(t.date),
    index('expenses_category_idx').on(t.category),
    index('expenses_status_idx').on(t.status),
    index('expenses_submitted_at_idx').on(t.submittedAt),
    index('expenses_created_at_idx').on(t.createdAt),
  ],
);
