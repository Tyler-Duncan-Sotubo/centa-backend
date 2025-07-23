"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applications = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.applications = (0, pg_core_1.pgTable)('applications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    jobId: (0, pg_core_1.uuid)('job_id')
        .references(() => schema_1.job_postings.id, { onDelete: 'cascade' })
        .notNull(),
    candidateId: (0, pg_core_1.uuid)('candidate_id')
        .references(() => schema_1.candidates.id, { onDelete: 'cascade' })
        .notNull(),
    source: (0, schema_1.applicationSourceEnum)('source').notNull().default('career_page'),
    status: (0, schema_1.AppStatus)('status').default('applied').notNull(),
    appliedAt: (0, pg_core_1.timestamp)('applied_at', { withTimezone: true }).defaultNow(),
    currentStage: (0, pg_core_1.uuid)('current_stage').references(() => schema_1.pipeline_stages.id),
    resumeScore: (0, pg_core_1.jsonb)('resume_score'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
}, (t) => [
    (0, pg_core_1.index)('idx_app_job').on(t.jobId),
    (0, pg_core_1.index)('idx_app_cand').on(t.candidateId),
    (0, pg_core_1.index)('idx_app_status').on(t.status),
]);
//# sourceMappingURL=applications.schema.js.map