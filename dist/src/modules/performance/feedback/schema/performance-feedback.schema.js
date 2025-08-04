"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceFeedback = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.performanceFeedback = (0, pg_core_1.pgTable)('performance_feedback', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    senderId: (0, pg_core_1.uuid)('sender_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    recipientId: (0, pg_core_1.uuid)('recipient_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    isAnonymous: (0, pg_core_1.boolean)('is_anonymous').default(false),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at').defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false),
}, (t) => [
    (0, pg_core_1.index)('idx_feedback_recipient_id').on(t.recipientId),
    (0, pg_core_1.index)('idx_feedback_sender_id').on(t.senderId),
]);
//# sourceMappingURL=performance-feedback.schema.js.map