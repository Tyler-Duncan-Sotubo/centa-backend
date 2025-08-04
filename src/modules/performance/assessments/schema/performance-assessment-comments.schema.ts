import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { performanceAssessments } from './performance-assessments.schema';

export const assessmentSectionComments = pgTable(
  'performance_assessment_section_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    assessmentId: uuid('assessment_id')
      .notNull()
      .references(() => performanceAssessments.id, { onDelete: 'cascade' }),

    section: text('section').$type<
      'goals' | 'feedback' | 'attendance' | 'questionnaire'
    >(),
    comment: text('comment'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('assessment_section_comments_assessment_id_idx').on(t.assessmentId),
    index('assessment_section_comments_section_idx').on(t.section),
  ],
);
