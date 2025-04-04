import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: text('action').notNull(), // e.g., 'CREATE_USER'
  entity: text('entity').notNull(), // e.g., 'User'
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
