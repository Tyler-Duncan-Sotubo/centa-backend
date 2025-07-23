"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeline_history = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const applications_schema_1 = require("../../applications/schema/applications.schema");
const schema_2 = require("../../schema");
exports.pipeline_history = (0, pg_core_1.pgTable)('pipeline_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)('application_id')
        .references(() => applications_schema_1.applications.id, { onDelete: 'cascade' })
        .notNull(),
    stageId: (0, pg_core_1.uuid)('stage_id')
        .references(() => schema_2.pipeline_stages.id, { onDelete: 'cascade' })
        .notNull(),
    movedAt: (0, pg_core_1.timestamp)('moved_at', { withTimezone: true }).defaultNow(),
    movedBy: (0, pg_core_1.uuid)('moved_by').references(() => schema_1.users.id),
    feedback: (0, pg_core_1.text)('feedback'),
}, (t) => [
    (0, pg_core_1.index)('idx_pipehist_app').on(t.applicationId),
    (0, pg_core_1.index)('idx_pipehist_stage').on(t.stageId),
]);
//# sourceMappingURL=pipeline-history.schema.js.map