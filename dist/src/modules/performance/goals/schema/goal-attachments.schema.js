"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalAttachments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_goals_schema_1 = require("./performance-goals.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.goalAttachments = (0, pg_core_1.pgTable)('performance_goal_attachments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    goalId: (0, pg_core_1.uuid)('goal_id')
        .notNull()
        .references(() => performance_goals_schema_1.performanceGoals.id, { onDelete: 'cascade' }),
    comment: (0, pg_core_1.text)('comment').notNull(),
    uploadedById: (0, pg_core_1.uuid)('uploaded_by_id')
        .notNull()
        .references(() => schema_1.users.id),
    fileUrl: (0, pg_core_1.text)('file_url').notNull(),
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_goal_attachments_goal_id').on(t.goalId)]);
//# sourceMappingURL=goal-attachments.schema.js.map