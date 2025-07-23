import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { interviews } from './interviews.schema';
import { scorecard_criteria } from './scorecard-criteria.schema';
import { users } from 'src/drizzle/schema';

export const interview_scores = pgTable('interview_scores', {
  id: uuid('id').defaultRandom().primaryKey(),

  interviewId: uuid('interview_id')
    .notNull()
    .references(() => interviews.id, { onDelete: 'cascade' }),

  criterionId: uuid('criterion_id')
    .notNull()
    .references(() => scorecard_criteria.id, { onDelete: 'cascade' }),

  score: integer('score').notNull(), // e.g. 0–5
  comment: text('comment'), // optional explanation for the score

  submittedBy: uuid('submitted_by').references(() => users.id),

  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
});
