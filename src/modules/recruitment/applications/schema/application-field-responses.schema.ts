import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { applications } from './applications.schema';

export const application_field_responses = pgTable(
  'application_field_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),

    label: varchar('label', { length: 255 }).notNull(), // e.g. "Phone Number"
    value: jsonb('value').notNull(), // string | object | array (e.g. file metadata, skills array, etc.)

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
);
