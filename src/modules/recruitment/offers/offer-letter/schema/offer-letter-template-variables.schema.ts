import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const offerLetterTemplateVariables = pgTable(
  'offer_letter_template_variables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // e.g., "candidateFirstName"
    isSystem: boolean('is_system').default(true), // true = system-defined
    companyId: uuid('company_id').references(() => companies.id), // null = system
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('template_variable_name_idx').on(t.name),
    index('template_variable_company_idx').on(t.companyId),
  ],
);
