"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentSectionComments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_assessments_schema_1 = require("./performance-assessments.schema");
exports.assessmentSectionComments = (0, pg_core_1.pgTable)('performance_assessment_section_comments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    assessmentId: (0, pg_core_1.uuid)('assessment_id')
        .notNull()
        .references(() => performance_assessments_schema_1.performanceAssessments.id, { onDelete: 'cascade' }),
    section: (0, pg_core_1.text)('section').$type(),
    comment: (0, pg_core_1.text)('comment'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('assessment_section_comments_assessment_id_idx').on(t.assessmentId),
    (0, pg_core_1.index)('assessment_section_comments_section_idx').on(t.section),
]);
//# sourceMappingURL=performance-assessment-comments.schema.js.map