"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationEvents = exports.notificationEntityTypeEnum = exports.notificationStatusEnum = exports.notificationChannelEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.notificationChannelEnum = (0, pg_core_1.pgEnum)('notification_channel', [
    'email',
    'in_app',
]);
exports.notificationStatusEnum = (0, pg_core_1.pgEnum)('notification_status', [
    'queued',
    'sent',
    'failed',
    'skipped',
]);
exports.notificationEntityTypeEnum = (0, pg_core_1.pgEnum)('notification_entity_type', [
    'goal',
    'assessment',
    'cycle',
    'announcement',
    'other',
]);
exports.notificationEvents = (0, pg_core_1.pgTable)('notification_events', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    channel: (0, exports.notificationChannelEnum)('channel').notNull().default('email'),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 100 }).notNull(),
    entityType: (0, exports.notificationEntityTypeEnum)('entity_type')
        .notNull()
        .default('other'),
    entityId: (0, pg_core_1.uuid)('entity_id'),
    recipientUserId: (0, pg_core_1.uuid)('recipient_user_id'),
    recipientEmployeeId: (0, pg_core_1.uuid)('recipient_employee_id'),
    recipientEmail: (0, pg_core_1.varchar)('recipient_email', { length: 320 }),
    dedupeKey: (0, pg_core_1.varchar)('dedupe_key', { length: 255 }).notNull(),
    status: (0, exports.notificationStatusEnum)('status').notNull().default('queued'),
    payload: (0, pg_core_1.text)('payload'),
    error: (0, pg_core_1.text)('error'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    queuedAt: (0, pg_core_1.timestamp)('queued_at', { withTimezone: true }),
    sentAt: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    failedAt: (0, pg_core_1.timestamp)('failed_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('notification_events_company_idx').on(t.companyId),
    (0, pg_core_1.index)('notification_events_recipient_idx').on(t.recipientUserId, t.recipientEmployeeId),
    (0, pg_core_1.index)('notification_events_entity_idx').on(t.entityType, t.entityId),
    (0, pg_core_1.index)('notification_events_type_idx').on(t.eventType),
    (0, pg_core_1.index)('notification_events_status_idx').on(t.status),
    (0, pg_core_1.uniqueIndex)('notification_events_dedupe_key_uq').on(t.dedupeKey),
]);
//# sourceMappingURL=notification-events.schema.js.map