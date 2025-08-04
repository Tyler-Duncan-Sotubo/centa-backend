"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackQuestions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.feedbackQuestions = (0, pg_core_1.pgTable)('performance_feedback_questions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    question: (0, pg_core_1.text)('question').notNull(),
    inputType: (0, pg_core_1.text)('input_type').default('text'),
    order: (0, pg_core_1.integer)('order').default(0),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=performance-feedback-questions.schema.js.map