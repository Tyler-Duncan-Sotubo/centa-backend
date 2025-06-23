import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { companies, users } from 'src/drizzle/schema';

export const blockedLeaveDays = pgTable('blocked_leave_days', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(), // e.g. "Christmas Day"
  date: text('date').notNull(),
  reason: text('reason'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // reference to a user/admin
  createdAt: timestamp('created_at').defaultNow(),
});
