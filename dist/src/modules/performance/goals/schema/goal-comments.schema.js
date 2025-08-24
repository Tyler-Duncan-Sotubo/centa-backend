"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalComments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_goals_schema_1 = require("./performance-goals.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.goalComments = (0, pg_core_1.pgTable)('performance_goal_comments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    goalId: (0, pg_core_1.uuid)('goal_id')
        .notNull()
        .references(() => performance_goals_schema_1.performanceGoals.id, { onDelete: 'cascade' }),
    authorId: (0, pg_core_1.uuid)('author_id')
        .notNull()
        .references(() => schema_1.users.id),
    comment: (0, pg_core_1.text)('comment').notNull(),
    isPrivate: (0, pg_core_1.boolean)('is_private').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_goal_comments_goal_id').on(t.goalId),
    (0, pg_core_1.index)('idx_goal_comments_author_id').on(t.authorId),
]);
//# sourceMappingURL=goal-comments.schema.js.map