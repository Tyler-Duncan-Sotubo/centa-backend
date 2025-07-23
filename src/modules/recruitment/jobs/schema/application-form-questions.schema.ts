// src/modules/jobs/schemas/applicationFormQuestions.schema.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  varchar,
  integer,
} from 'drizzle-orm/pg-core';
import { application_form_configs } from './application-form-configs.schema';
import { companies } from 'src/drizzle/schema';

export const application_form_questions = pgTable(
  'application_form_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formId: uuid('form_id')
      .notNull()
      .references(() => application_form_configs.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'yes_no', 'short_text', 'paragraph'
    required: boolean('required').default(true),
    order: integer('order').notNull(),
    companyId: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
  },
);
