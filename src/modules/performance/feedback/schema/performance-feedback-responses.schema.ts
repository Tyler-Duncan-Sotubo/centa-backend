import { pgTable, uuid, text, integer, index } from 'drizzle-orm/pg-core';
import { performanceFeedback } from './performance-feedback.schema';
import { feedbackQuestions } from './performance-feedback-questions.schema';

export const feedbackResponses = pgTable(
  'performance_feedback_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    feedbackId: uuid('feedback_id')
      .notNull()
      .references(() => performanceFeedback.id, { onDelete: 'cascade' }),

    question: uuid('question_id')
      .notNull()
      .references(() => feedbackQuestions.id, { onDelete: 'cascade' }),

    answer: text('answer').notNull(),

    order: integer('order').default(0),
  },
  (t) => [index('idx_feedback_question_feedback_id').on(t.feedbackId)],
);
