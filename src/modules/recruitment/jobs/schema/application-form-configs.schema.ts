import { pgTable, uuid, timestamp, boolean } from 'drizzle-orm/pg-core';
import { job_postings } from './job-postings.schema';
import { applicationStyleEnum } from '../../schema';

export const application_form_configs = pgTable('application_form_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => job_postings.id, { onDelete: 'cascade' })
    .unique(),
  style: applicationStyleEnum('style').notNull(), // 'resume_only', 'form_only', 'both'
  includeReferences: boolean('include_references').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
