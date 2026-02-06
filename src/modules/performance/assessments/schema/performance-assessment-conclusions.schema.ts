// ✅ Schema: back-and-forth conclusion review workflow + indexes

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { performanceAssessments } from './performance-assessments.schema';

// Review workflow states:
// - draft: LM working
// - pending_hr: LM submitted to HR
// - needs_changes: HR sent back to LM
// - approved: HR finalized/locked
export const conclusionReviewStatusEnum = pgEnum('conclusion_review_status', [
  'draft',
  'pending_hr',
  'needs_changes',
  'approved',
]);

export const assessmentConclusions = pgTable(
  'performance_assessment_conclusions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    assessmentId: uuid('assessment_id')
      .notNull()
      .unique()
      .references(() => performanceAssessments.id, { onDelete: 'cascade' }),

    summary: text('summary'),
    strengths: text('strengths'),
    areasForImprovement: text('areas_for_improvement'),
    finalScore: integer('final_score'),
    promotionRecommendation: text('promotion_recommendation'),
    potentialFlag: boolean('potential_flag').default(false),

    // Workflow
    reviewStatus: conclusionReviewStatusEnum('review_status')
      .notNull()
      .default('draft'),

    // LM → HR
    submittedToHrAt: timestamp('submitted_to_hr_at'),
    submittedToHrBy: uuid('submitted_to_hr_by'),

    // HR → LM
    changesRequestedAt: timestamp('changes_requested_at'),
    changesRequestedBy: uuid('changes_requested_by'),
    changesRequestNote: text('changes_request_note'),

    // HR final
    hrApprovedAt: timestamp('hr_approved_at'),
    hrApprovedBy: uuid('hr_approved_by'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (t) => [
    // 🔍 Core lookups
    index('idx_assessment_conclusions_assessment_id').on(t.assessmentId),

    // 🔍 Workflow filtering
    index('idx_assessment_conclusions_review_status').on(t.reviewStatus),

    // 🔍 HR review queues (ordered by submission time)
    index('idx_assessment_conclusions_pending_hr').on(
      t.reviewStatus,
      t.submittedToHrAt,
    ),

    // 🔍 LM rework queue (needs changes)
    index('idx_assessment_conclusions_needs_changes').on(
      t.reviewStatus,
      t.changesRequestedAt,
    ),

    // 🔍 Audit / reporting
    index('idx_assessment_conclusions_submitted_by').on(t.submittedToHrBy),
    index('idx_assessment_conclusions_hr_approved_by').on(t.hrApprovedBy),
  ],
);
