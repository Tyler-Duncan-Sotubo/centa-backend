import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const companySettings = pgTable(
  'company_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),

    key: text('key').notNull(), // Example: 'leave.approver'

    value: jsonb('value').notNull(), // Flexible value storage (string, number, object, array)

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_company_settings').on(t.companyId),
    index('idx_company_settings_key').on(t.key),
    unique().on(t.companyId, t.key),
  ],
);
