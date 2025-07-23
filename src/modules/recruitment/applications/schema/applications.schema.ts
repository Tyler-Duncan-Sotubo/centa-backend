import { pgTable, uuid, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import {
  applicationSourceEnum,
  AppStatus,
  candidates,
  job_postings,
  pipeline_stages,
} from '../../schema';

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    jobId: uuid('job_id')
      .references(() => job_postings.id, { onDelete: 'cascade' })
      .notNull(),
    candidateId: uuid('candidate_id')
      .references(() => candidates.id, { onDelete: 'cascade' })
      .notNull(),
    source: applicationSourceEnum('source').notNull().default('career_page'),
    status: AppStatus('status').default('applied').notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow(),
    currentStage: uuid('current_stage').references(() => pipeline_stages.id),
    resumeScore: jsonb('resume_score'), // Store resume score details
    metadata: jsonb('metadata'),
  },
  (t) => [
    index('idx_app_job').on(t.jobId),
    index('idx_app_cand').on(t.candidateId),
    index('idx_app_status').on(t.status),
  ],
);
