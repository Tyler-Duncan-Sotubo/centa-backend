import {
  pgTable,
  boolean,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const verificationToken = pgTable(
  'verificationToken',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    is_used: boolean('is_used').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('idx_user_id_verification').on(table.user_id)],
);
