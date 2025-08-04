"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceReviewQuestions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_competencies_schema_1 = require("./performance-competencies.schema");
exports.performanceReviewQuestions = (0, pg_core_1.pgTable)('performance_review_questions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    competencyId: (0, pg_core_1.uuid)('competency_id').references(() => performance_competencies_schema_1.performanceCompetencies.id, {
        onDelete: 'set null',
    }),
    question: (0, pg_core_1.text)('question').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    isMandatory: (0, pg_core_1.boolean)('is_mandatory').default(false),
    allowNotes: (0, pg_core_1.boolean)('allow_notes').default(false),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_performance_review_questions_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_performance_review_questions_competency').on(t.competencyId),
    (0, pg_core_1.index)('idx_performance_review_questions_is_global').on(t.isGlobal),
]);
//# sourceMappingURL=performance-review-questions.schema.js.map