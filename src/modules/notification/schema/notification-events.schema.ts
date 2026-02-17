// src/modules/notification/schema/notification-events.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'in_app',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
  'skipped',
]);

export const notificationEntityTypeEnum = pgEnum('notification_entity_type', [
  'goal',
  'assessment',
  'cycle',
  'announcement',
  'other',
]);

export const notificationEvents = pgTable(
  'notification_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id').notNull(),

    channel: notificationChannelEnum('channel').notNull().default('email'),

    // goal_due_t7, cycle_t2_self, etc
    eventType: varchar('event_type', { length: 100 }).notNull(),

    entityType: notificationEntityTypeEnum('entity_type')
      .notNull()
      .default('other'),

    entityId: uuid('entity_id'),

    recipientUserId: uuid('recipient_user_id'),
    recipientEmployeeId: uuid('recipient_employee_id'),
    recipientEmail: varchar('recipient_email', { length: 320 }),

    // your anti-spam nuclear weapon
    dedupeKey: varchar('dedupe_key', { length: 255 }).notNull(),

    status: notificationStatusEnum('status').notNull().default('queued'),

    payload: text('payload'),
    error: text('error'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    queuedAt: timestamp('queued_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
  },
  (t) => [
    // fast company lookups
    index('notification_events_company_idx').on(t.companyId),

    // who received
    index('notification_events_recipient_idx').on(
      t.recipientUserId,
      t.recipientEmployeeId,
    ),

    // by entity
    index('notification_events_entity_idx').on(t.entityType, t.entityId),

    // by type (useful for reporting)
    index('notification_events_type_idx').on(t.eventType),

    // most common operational filter
    index('notification_events_status_idx').on(t.status),

    // THE IMPORTANT ONE
    uniqueIndex('notification_events_dedupe_key_uq').on(t.dedupeKey),
  ],
);
