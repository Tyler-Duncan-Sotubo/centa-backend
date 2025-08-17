"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectiveAttachments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_key_results_schema_1 = require("./performance-key-results.schema");
const performance_objectives_schema_1 = require("./performance-objectives.schema");
exports.objectiveAttachments = (0, pg_core_1.pgTable)('performance_goal_attachments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    objectiveId: (0, pg_core_1.uuid)('objective_id').references(() => performance_objectives_schema_1.objectives.id, {
        onDelete: 'cascade',
    }),
    keyResultId: (0, pg_core_1.uuid)('key_result_id').references(() => performance_key_results_schema_1.keyResults.id, {
        onDelete: 'cascade',
    }),
    comment: (0, pg_core_1.text)('comment'),
    uploadedById: (0, pg_core_1.uuid)('uploaded_by_id')
        .notNull()
        .references(() => schema_1.users.id),
    fileUrl: (0, pg_core_1.text)('file_url').notNull(),
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_goal_attachments_objective_id').on(t.objectiveId),
    (0, pg_core_1.index)('idx_goal_attachments_key_result_id').on(t.keyResultId),
]);
//# sourceMappingURL=goal-attachments.schema.js.map