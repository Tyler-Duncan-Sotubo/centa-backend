"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceGoalUpdates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_goals_schema_1 = require("./performance-goals.schema");
exports.performanceGoalUpdates = (0, pg_core_1.pgTable)('performance_goal_updates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    goalId: (0, pg_core_1.uuid)('goal_id')
        .notNull()
        .references(() => performance_goals_schema_1.performanceGoals.id, {
        onDelete: 'cascade',
    }),
    progress: (0, pg_core_1.integer)('progress').notNull().default(0),
    note: (0, pg_core_1.text)('note'),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .notNull()
        .references(() => schema_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=performance-goal-updates.schema.js.map