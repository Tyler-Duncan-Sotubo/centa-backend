import { boolean, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const application_field_definitions = pgTable(
  'application_field_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    section: varchar('section', { length: 50 }).notNull(), // e.g., 'personal', 'education'
    label: varchar('label', { length: 255 }).notNull(), // e.g., 'Phone Number'
    fieldType: varchar('field_type', { length: 50 }).notNull(), // 'text', 'file', etc.
    isGlobal: boolean('is_global').default(true), // Always true now, really
  },
);
