"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceGoalUpdates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_objectives_schema_1 = require("./performance-objectives.schema");
const performance_key_results_schema_1 = require("./performance-key-results.schema");
exports.performanceGoalUpdates = (0, pg_core_1.pgTable)('performance_progress_updates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    objectiveId: (0, pg_core_1.uuid)('objective_id').references(() => performance_objectives_schema_1.objectives.id, {
        onDelete: 'cascade',
    }),
    keyResultId: (0, pg_core_1.uuid)('key_result_id').references(() => performance_key_results_schema_1.keyResults.id, {
        onDelete: 'cascade',
    }),
    value: (0, pg_core_1.text)('value'),
    progressPct: (0, pg_core_1.integer)('progress_pct'),
    note: (0, pg_core_1.text)('note'),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .notNull()
        .references(() => schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, () => []);
//# sourceMappingURL=performance-goal-updates.schema.js.map