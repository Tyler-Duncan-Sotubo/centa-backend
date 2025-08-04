"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentConclusions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_assessments_schema_1 = require("./performance-assessments.schema");
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
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at'),
});
//# sourceMappingURL=performance-assessment-conclusions.schema.js.map