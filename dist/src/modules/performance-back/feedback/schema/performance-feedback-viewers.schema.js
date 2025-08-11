"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackViewers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_feedback_schema_1 = require("./performance-feedback.schema");
exports.feedbackViewers = (0, pg_core_1.pgTable)('performance_feedback_viewers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    feedbackId: (0, pg_core_1.uuid)('feedback_id')
        .notNull()
        .references(() => performance_feedback_schema_1.performanceFeedback.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    canView: (0, pg_core_1.boolean)('can_view').default(true),
}, (t) => [
    (0, pg_core_1.index)('idx_feedback_viewers_feedback_id').on(t.feedbackId),
    (0, pg_core_1.index)('idx_feedback_viewers_user_id').on(t.userId),
]);
//# sourceMappingURL=performance-feedback-viewers.schema.js.map