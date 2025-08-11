"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackResponses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_feedback_schema_1 = require("./performance-feedback.schema");
const performance_feedback_questions_schema_1 = require("./performance-feedback-questions.schema");
exports.feedbackResponses = (0, pg_core_1.pgTable)('performance_feedback_responses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    feedbackId: (0, pg_core_1.uuid)('feedback_id')
        .notNull()
        .references(() => performance_feedback_schema_1.performanceFeedback.id, { onDelete: 'cascade' }),
    question: (0, pg_core_1.uuid)('question_id')
        .notNull()
        .references(() => performance_feedback_questions_schema_1.feedbackQuestions.id, { onDelete: 'cascade' }),
    answer: (0, pg_core_1.text)('answer').notNull(),
    order: (0, pg_core_1.integer)('order').default(0),
}, (t) => [(0, pg_core_1.index)('idx_feedback_question_feedback_id').on(t.feedbackId)]);
//# sourceMappingURL=performance-feedback-responses.schema.js.map