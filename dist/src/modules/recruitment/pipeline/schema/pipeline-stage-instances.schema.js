"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeline_stage_instances = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.pipeline_stage_instances = (0, pg_core_1.pgTable)('pipeline_stage_instances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)('application_id')
        .notNull()
        .references(() => schema_1.applications.id, { onDelete: 'cascade' }),
    stageId: (0, pg_core_1.uuid)('stage_id')
        .notNull()
        .references(() => schema_1.pipeline_stages.id, { onDelete: 'cascade' }),
    enteredAt: (0, pg_core_1.timestamp)('entered_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_stage_instance_app').on(t.applicationId),
    (0, pg_core_1.index)('idx_stage_instance_stage').on(t.stageId),
]);
//# sourceMappingURL=pipeline-stage-instances.schema.js.map