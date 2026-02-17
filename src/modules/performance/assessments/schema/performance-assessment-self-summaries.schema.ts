// performance-assessment-self-summaries.schema.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { performanceAssessments } from './performance-assessments.schema';
import { users } from 'src/drizzle/schema';

export const assessmentSelfSummaries = pgTable(
  'performance_assessment_self_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => performanceAssessments.id, { onDelete: 'cascade' }),

    summary: text('summary').notNull(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    index('idx_self_summary_assessment_id').on(t.assessmentId),
    // add UNIQUE in migration: UNIQUE(assessment_id)
  ],
);
