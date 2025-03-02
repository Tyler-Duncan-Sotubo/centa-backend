import { pgTable, uuid, timestamp, index, text } from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

// notification Table
export const notification = pgTable(
  'notification',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    message: text('message').notNull(),
    type: text('type').notNull(),
    read: text('read').notNull().default('false'),
    url: text('url').notNull(),

    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),

    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('idx_user_id').on(table.company_id)],
);
