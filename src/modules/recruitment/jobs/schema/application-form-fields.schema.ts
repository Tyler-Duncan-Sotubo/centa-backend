import { pgTable, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { application_form_configs } from './application-form-configs.schema';

export const application_form_fields = pgTable('application_form_fields', {
  id: uuid('id').defaultRandom().primaryKey(),

  formId: uuid('form_id')
    .notNull()
    .references(() => application_form_configs.id, { onDelete: 'cascade' }),

  section: varchar('section', { length: 50 }).notNull(),
  isVisible: boolean('is_visible').default(true),
  isEditable: boolean('is_editable').default(true),
  label: varchar('label', { length: 255 }).notNull(),
  fieldType: varchar('field_type', { length: 50 }).notNull(),
  required: boolean('required').default(true),
  order: integer('order').notNull(),
});
