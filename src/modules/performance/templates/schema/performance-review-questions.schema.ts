import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { performanceCompetencies } from './performance-competencies.schema';

export const performanceReviewQuestions = pgTable(
  'performance_review_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    competencyId: uuid('competency_id').references(
      () => performanceCompetencies.id,
      {
        onDelete: 'set null',
      },
    ),

    question: text('question').notNull(),
    type: text('type').notNull(), // dropdown, text, etc.
    isMandatory: boolean('is_mandatory').default(false),
    allowNotes: boolean('allow_notes').default(false),
    isActive: boolean('is_active').default(true),
    isGlobal: boolean('is_global').default(false),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('idx_performance_review_questions_company_id').on(t.companyId),
    index('idx_performance_review_questions_competency').on(t.competencyId),
    index('idx_performance_review_questions_is_global').on(t.isGlobal),
  ],
);
