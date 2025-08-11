"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceAssessments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.performanceAssessments = (0, pg_core_1.pgTable)('performance_assessments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    cycleId: (0, pg_core_1.uuid)('cycle_id')
        .notNull()
        .references(() => schema_1.performanceCycles.id, { onDelete: 'cascade' }),
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => schema_1.performanceReviewTemplates.id, { onDelete: 'cascade' }),
    reviewerId: (0, pg_core_1.uuid)('reviewer_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    revieweeId: (0, pg_core_1.uuid)('reviewee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').$type().notNull(),
    status: (0, pg_core_1.text)('status')
        .$type()
        .default('not_started'),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('performance_assessments_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('performance_assessments_cycle_id_idx').on(t.cycleId),
]);
//# sourceMappingURL=performance-assessments.schema.js.map