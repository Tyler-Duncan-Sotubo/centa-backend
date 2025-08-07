"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.termination_progress = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const termination_checklist_items_schema_1 = require("./termination-checklist-items.schema");
const termination_sessions_schema_1 = require("./termination-sessions.schema");
exports.termination_progress = (0, pg_core_1.pgTable)('termination_progress', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id')
        .notNull()
        .references(() => termination_sessions_schema_1.termination_sessions.id, { onDelete: 'cascade' }),
    checklistItemId: (0, pg_core_1.uuid)('checklist_item_id')
        .notNull()
        .references(() => termination_checklist_items_schema_1.termination_checklist_items.id, {
        onDelete: 'cascade',
    }),
    completed: (0, pg_core_1.boolean)('completed').default(false),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
}, (t) => [
    (0, pg_core_1.index)('termination_progress_session_id_idx').on(t.sessionId),
    (0, pg_core_1.index)('termination_progress_checklist_item_id_idx').on(t.checklistItemId),
]);
//# sourceMappingURL=termination-progress.schema.js.map