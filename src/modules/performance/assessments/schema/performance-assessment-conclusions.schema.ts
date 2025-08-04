import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { performanceAssessments } from './performance-assessments.schema';

export const assessmentConclusions = pgTable(
  'performance_assessment_conclusions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    assessmentId: uuid('assessment_id')
      .notNull()
      .unique() // 1 conclusion per assessment
      .references(() => performanceAssessments.id, { onDelete: 'cascade' }),

    summary: text('summary'), // Free text written by reviewer (e.g., manager)
    strengths: text('strengths'), // Optional highlights
    areasForImprovement: text('areas_for_improvement'), // Development areas
    finalScore: integer('final_score'), // Normalized score (optional)
    promotionRecommendation: text('promotion_recommendation'), // e.g., 'promote', 'no change', etc.
    potentialFlag: boolean('potential_flag').default(false), // High-potential employee?

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
);
