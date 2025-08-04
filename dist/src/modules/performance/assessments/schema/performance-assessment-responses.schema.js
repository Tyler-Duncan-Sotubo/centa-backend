"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentResponses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_assessments_schema_1 = require("./performance-assessments.schema");
exports.assessmentResponses = (0, pg_core_1.pgTable)('performance_assessment_responses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    assessmentId: (0, pg_core_1.uuid)('assessment_id')
        .notNull()
        .references(() => performance_assessments_schema_1.performanceAssessments.id, { onDelete: 'cascade' }),
    questionId: (0, pg_core_1.uuid)('question_id')
        .notNull()
        .references(() => schema_1.performanceReviewQuestions.id, { onDelete: 'cascade' }),
    response: (0, pg_core_1.text)('response'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('assessment_responses_assessment_id_idx').on(t.assessmentId),
    (0, pg_core_1.index)('assessment_responses_question_id_idx').on(t.questionId),
]);
//# sourceMappingURL=performance-assessment-responses.schema.js.map