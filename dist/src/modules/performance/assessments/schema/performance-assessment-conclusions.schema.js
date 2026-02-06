"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentConclusions = exports.conclusionReviewStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_assessments_schema_1 = require("./performance-assessments.schema");
exports.conclusionReviewStatusEnum = (0, pg_core_1.pgEnum)('conclusion_review_status', [
    'draft',
    'pending_hr',
    'needs_changes',
    'approved',
]);
exports.assessmentConclusions = (0, pg_core_1.pgTable)('performance_assessment_conclusions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    assessmentId: (0, pg_core_1.uuid)('assessment_id')
        .notNull()
        .unique()
        .references(() => performance_assessments_schema_1.performanceAssessments.id, { onDelete: 'cascade' }),
    summary: (0, pg_core_1.text)('summary'),
    strengths: (0, pg_core_1.text)('strengths'),
    areasForImprovement: (0, pg_core_1.text)('areas_for_improvement'),
    finalScore: (0, pg_core_1.integer)('final_score'),
    promotionRecommendation: (0, pg_core_1.text)('promotion_recommendation'),
    potentialFlag: (0, pg_core_1.boolean)('potential_flag').default(false),
    reviewStatus: (0, exports.conclusionReviewStatusEnum)('review_status')
        .notNull()
        .default('draft'),
    submittedToHrAt: (0, pg_core_1.timestamp)('submitted_to_hr_at'),
    submittedToHrBy: (0, pg_core_1.uuid)('submitted_to_hr_by'),
    changesRequestedAt: (0, pg_core_1.timestamp)('changes_requested_at'),
    changesRequestedBy: (0, pg_core_1.uuid)('changes_requested_by'),
    changesRequestNote: (0, pg_core_1.text)('changes_request_note'),
    hrApprovedAt: (0, pg_core_1.timestamp)('hr_approved_at'),
    hrApprovedBy: (0, pg_core_1.uuid)('hr_approved_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at'),
}, (t) => [
    (0, pg_core_1.index)('idx_assessment_conclusions_assessment_id').on(t.assessmentId),
    (0, pg_core_1.index)('idx_assessment_conclusions_review_status').on(t.reviewStatus),
    (0, pg_core_1.index)('idx_assessment_conclusions_pending_hr').on(t.reviewStatus, t.submittedToHrAt),
    (0, pg_core_1.index)('idx_assessment_conclusions_needs_changes').on(t.reviewStatus, t.changesRequestedAt),
    (0, pg_core_1.index)('idx_assessment_conclusions_submitted_by').on(t.submittedToHrBy),
    (0, pg_core_1.index)('idx_assessment_conclusions_hr_approved_by').on(t.hrApprovedBy),
]);
//# sourceMappingURL=performance-assessment-conclusions.schema.js.map