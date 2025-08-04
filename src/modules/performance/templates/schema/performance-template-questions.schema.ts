import { boolean, index, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { performanceReviewQuestions } from './performance-review-questions.schema';
import { performanceReviewTemplates } from './performance-review-templates.schema';

export const performanceTemplateQuestions = pgTable(
  'performance_template_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => performanceReviewTemplates.id, { onDelete: 'cascade' }),

    questionId: uuid('question_id')
      .notNull()
      .references(() => performanceReviewQuestions.id, { onDelete: 'cascade' }),

    order: integer('order').default(0),
    isMandatory: boolean('is_mandatory').default(false),
  },
  (t) => [
    index('idx_template_questions_template_id').on(t.templateId),
    index('idx_template_questions_question_id').on(t.questionId),
  ],
);
