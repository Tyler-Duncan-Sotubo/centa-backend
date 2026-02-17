"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentSelfSummaries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_assessments_schema_1 = require("./performance-assessments.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.assessmentSelfSummaries = (0, pg_core_1.pgTable)('performance_assessment_self_summaries', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    assessmentId: (0, pg_core_1.uuid)('assessment_id')
        .notNull()
        .references(() => performance_assessments_schema_1.performanceAssessments.id, { onDelete: 'cascade' }),
    summary: (0, pg_core_1.text)('summary').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .notNull()
        .references(() => schema_1.users.id),
    updatedBy: (0, pg_core_1.uuid)('updated_by')
        .notNull()
        .references(() => schema_1.users.id),
}, (t) => [
    (0, pg_core_1.index)('idx_self_summary_assessment_id').on(t.assessmentId),
]);
//# sourceMappingURL=performance-assessment-self-summaries.schema.js.map