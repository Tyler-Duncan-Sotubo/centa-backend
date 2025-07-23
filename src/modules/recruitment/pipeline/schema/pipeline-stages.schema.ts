import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { job_postings } from '../../schema';

export const pipeline_stages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .references(() => job_postings.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    order: integer('order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_stage_job').on(t.jobId),
    index('idx_stage_job_order').on(t.jobId, t.order),
  ],
);
