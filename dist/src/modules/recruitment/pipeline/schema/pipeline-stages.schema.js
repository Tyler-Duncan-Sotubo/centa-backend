"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeline_stages = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.pipeline_stages = (0, pg_core_1.pgTable)('pipeline_stages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    jobId: (0, pg_core_1.uuid)('job_id')
        .references(() => schema_1.job_postings.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    order: (0, pg_core_1.integer)('order').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_stage_job').on(t.jobId),
    (0, pg_core_1.index)('idx_stage_job_order').on(t.jobId, t.order),
]);
//# sourceMappingURL=pipeline-stages.schema.js.map