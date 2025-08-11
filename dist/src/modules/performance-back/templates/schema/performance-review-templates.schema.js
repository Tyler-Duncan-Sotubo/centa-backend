"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceReviewTemplates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.performanceReviewTemplates = (0, pg_core_1.pgTable)('performance_review_templates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false),
    includeGoals: (0, pg_core_1.boolean)('include_goals').default(false),
    includeAttendance: (0, pg_core_1.boolean)('include_attendance').default(false),
    includeFeedback: (0, pg_core_1.boolean)('include_feedback').default(false),
    includeQuestionnaire: (0, pg_core_1.boolean)('include_questionnaire').default(false),
    requireSignature: (0, pg_core_1.boolean)('require_signature').default(false),
    restrictVisibility: (0, pg_core_1.boolean)('restrict_visibility').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_performance_review_templates_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_performance_review_templates_default').on(t.isDefault),
]);
//# sourceMappingURL=performance-review-templates.schema.js.map