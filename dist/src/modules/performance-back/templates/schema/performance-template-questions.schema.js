"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceTemplateQuestions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_review_questions_schema_1 = require("./performance-review-questions.schema");
const performance_review_templates_schema_1 = require("./performance-review-templates.schema");
exports.performanceTemplateQuestions = (0, pg_core_1.pgTable)('performance_template_questions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => performance_review_templates_schema_1.performanceReviewTemplates.id, { onDelete: 'cascade' }),
    questionId: (0, pg_core_1.uuid)('question_id')
        .notNull()
        .references(() => performance_review_questions_schema_1.performanceReviewQuestions.id, { onDelete: 'cascade' }),
    order: (0, pg_core_1.integer)('order').default(0),
    isMandatory: (0, pg_core_1.boolean)('is_mandatory').default(false),
}, (t) => [
    (0, pg_core_1.index)('idx_template_questions_template_id').on(t.templateId),
    (0, pg_core_1.index)('idx_template_questions_question_id').on(t.questionId),
]);
//# sourceMappingURL=performance-template-questions.schema.js.map