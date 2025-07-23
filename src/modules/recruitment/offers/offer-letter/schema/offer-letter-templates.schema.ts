import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const offerLetterTemplates = pgTable('offer_letter_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  name: text('name').notNull(),
  content: text('content').notNull(),
  isDefault: boolean('is_default').default(false),
  isSystemTemplate: boolean('is_system_template').default(false), // ← NEW
  createdAt: timestamp('created_at').defaultNow(),
  clonedFromTemplateId: uuid('cloned_from_template_id'), // ← optional trace
});
