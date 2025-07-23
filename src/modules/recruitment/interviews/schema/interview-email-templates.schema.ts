import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const interviewEmailTemplates = pgTable('interview_email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(), // support placeholders like {{candidateName}}
  isGlobal: boolean('is_global').default(false),
  companyId: uuid('company_id').references(() => companies.id),
  createdBy: uuid('created_by'), // FK to users or admins
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
