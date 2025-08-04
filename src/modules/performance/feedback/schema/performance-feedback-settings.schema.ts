import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const feedbackSettings = pgTable('performance_feedback_settings', {
  id: uuid('id').primaryKey().defaultRandom(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  enableEmployeeFeedback: boolean('enable_employee_feedback').default(true),
  enableManagerFeedback: boolean('enable_manager_feedback').default(true),
  allowAnonymous: boolean('allow_anonymous').default(false),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
});
