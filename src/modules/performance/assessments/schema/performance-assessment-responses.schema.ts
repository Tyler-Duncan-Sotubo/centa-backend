import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { performanceReviewQuestions } from 'src/drizzle/schema';
import { performanceAssessments } from './performance-assessments.schema';

export const assessmentResponses = pgTable(
  'performance_assessment_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => performanceAssessments.id, { onDelete: 'cascade' }),

    questionId: uuid('question_id')
      .notNull()
      .references(() => performanceReviewQuestions.id, { onDelete: 'cascade' }),

    response: text('response'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('assessment_responses_assessment_id_idx').on(t.assessmentId),
    index('assessment_responses_question_id_idx').on(t.questionId),
  ],
);
