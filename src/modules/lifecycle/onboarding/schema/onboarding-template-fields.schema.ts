import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { onboardingTemplates } from './onboarding-templates.schema';

export const onboardingTemplateFields = pgTable(
  'onboarding_template_fields',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => onboardingTemplates.id, { onDelete: 'cascade' }),

    fieldKey: text('field_key').notNull(), // e.g. "bank_account"
    label: text('label').notNull(),
    fieldType: text('field_type').notNull(), // e.g. text, date, file
    required: boolean('required').default(false),
    order: integer('order').default(0),

    tag: text('tag').notNull(), // e.g. "personal_info", "bank_details"
  },
  (t) => [
    index('onboarding_template_fields_template_id_idx').on(t.templateId),
    index('onboarding_template_fields_field_key_idx').on(t.fieldKey),
    index('onboarding_template_fields_tag_idx').on(t.tag),
  ],
);
