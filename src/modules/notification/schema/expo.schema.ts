// src/drizzle/notifications.ts
import {
  pgTable,
  uuid,
  timestamp,
  text,
  index,
  boolean,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';

/**
 * Devices registered for push (Expo tokens).
 * One employee can have multiple devices.
 */
export const expoPushDevices = pgTable(
  'expo_push_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    expoPushToken: text('expo_push_token').notNull(), // e.g. ExponentPushToken[...]
    platform: text('platform').notNull(), // 'ios' | 'android'
    deviceId: text('device_id'), // Device.osBuildId or your own installation id
    appVersion: text('app_version'),

    lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
    disabledAt: timestamp('disabled_at'), // if token is invalid/disabled

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('push_devices_employee_id_idx').on(t.employeeId),
    index('push_devices_company_id_idx').on(t.companyId),
    index('push_devices_token_idx').on(t.expoPushToken),
    index('push_devices_platform_idx').on(t.platform),
  ],
);

/**
 * Durable notifications per employee (your in-app inbox).
 * The badge count should be computed from readAt IS NULL on this table.
 */
export const expo_notifications = pgTable(
  'expo_notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    // Basic content
    title: text('title').notNull(),
    body: text('body'),
    type: text('type').notNull(), // 'message' | 'reminder' | 'system' | ...

    // Deep link / routing (your app reads these from notification.data)
    route: text('route'), // e.g. '/tasks/[id]'
    // Arbitrary payload used by the app screen (kept server-side for durability)
    data: jsonb('data').$type<Record<string, unknown>>().default({}).notNull(),

    // Optional external URL (if tapping should open web)
    url: text('url'),

    // Read / lifecycle tracking
    readAt: timestamp('read_at'),
    deliveredAt: timestamp('delivered_at'), // first successful push delivery
    openedAt: timestamp('opened_at'), // user tapped/opened in-app

    // Server-computed badge snapshot (useful for iOS payloads)
    badgeAtSend: integer('badge_at_send'),

    isArchived: boolean('is_archived').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('expo_notifications_employee_id_idx').on(t.employeeId),
    index('expo_notifications_company_id_idx').on(t.companyId),
    index('expo_notifications_type_idx').on(t.type),
    index('expo_notifications_created_at_idx').on(t.createdAt),
    index('expo_notifications_read_at_idx').on(t.readAt),
    index('expo_notifications_archived_idx').on(t.isArchived),
  ],
);

/**
 * (Optional) Per-device delivery auditing & Expo receipts.
 * Useful if you want to know which device(s) got which notification and why some failed.
 */
export const expo_notificationDeliveries = pgTable(
  'expo_notification_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    notificationId: uuid('notification_id')
      .notNull()
      .references(() => expo_notifications.id, { onDelete: 'cascade' }),

    pushDeviceId: uuid('push_device_id')
      .notNull()
      .references(() => expoPushDevices.id, { onDelete: 'cascade' }),

    // Expo send ticket id (returned when you POST to Expo push API)
    expoTicketId: text('expo_ticket_id'),

    // Receipt info after checking with Expo (status: 'ok' | 'error', details...)
    expoReceiptId: text('expo_receipt_id'),
    receiptStatus: text('receipt_status'), // 'ok' | 'error' | 'unknown'
    receiptError: text('receipt_error'),
    receiptDetails: jsonb('receipt_details').$type<Record<string, unknown>>(),

    // State
    sentAt: timestamp('sent_at'),
    deliveredAt: timestamp('delivered_at'),
    failedAt: timestamp('failed_at'),
    failureReason: text('failure_reason'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('notif_deliveries_notification_id_idx').on(t.notificationId),
    index('notif_deliveries_push_device_id_idx').on(t.pushDeviceId),
    index('notif_deliveries_ticket_idx').on(t.expoTicketId),
    index('notif_deliveries_receipt_idx').on(t.expoReceiptId),
  ],
);
