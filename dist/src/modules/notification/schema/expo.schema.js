"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expo_notificationDeliveries = exports.expo_notifications = exports.expoPushDevices = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.expoPushDevices = (0, pg_core_1.pgTable)('expo_push_devices', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    expoPushToken: (0, pg_core_1.text)('expo_push_token').notNull(),
    platform: (0, pg_core_1.text)('platform').notNull(),
    deviceId: (0, pg_core_1.text)('device_id'),
    appVersion: (0, pg_core_1.text)('app_version'),
    lastSyncedAt: (0, pg_core_1.timestamp)('last_synced_at').defaultNow().notNull(),
    disabledAt: (0, pg_core_1.timestamp)('disabled_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('push_devices_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('push_devices_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('push_devices_token_idx').on(t.expoPushToken),
    (0, pg_core_1.index)('push_devices_platform_idx').on(t.platform),
]);
exports.expo_notifications = (0, pg_core_1.pgTable)('expo_notifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    title: (0, pg_core_1.text)('title').notNull(),
    body: (0, pg_core_1.text)('body'),
    type: (0, pg_core_1.text)('type').notNull(),
    route: (0, pg_core_1.text)('route'),
    data: (0, pg_core_1.jsonb)('data').$type().default({}).notNull(),
    url: (0, pg_core_1.text)('url'),
    readAt: (0, pg_core_1.timestamp)('read_at'),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at'),
    openedAt: (0, pg_core_1.timestamp)('opened_at'),
    badgeAtSend: (0, pg_core_1.integer)('badge_at_send'),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('expo_notifications_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('expo_notifications_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('expo_notifications_type_idx').on(t.type),
    (0, pg_core_1.index)('expo_notifications_created_at_idx').on(t.createdAt),
    (0, pg_core_1.index)('expo_notifications_read_at_idx').on(t.readAt),
    (0, pg_core_1.index)('expo_notifications_archived_idx').on(t.isArchived),
]);
exports.expo_notificationDeliveries = (0, pg_core_1.pgTable)('expo_notification_deliveries', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    notificationId: (0, pg_core_1.uuid)('notification_id')
        .notNull()
        .references(() => exports.expo_notifications.id, { onDelete: 'cascade' }),
    pushDeviceId: (0, pg_core_1.uuid)('push_device_id')
        .notNull()
        .references(() => exports.expoPushDevices.id, { onDelete: 'cascade' }),
    expoTicketId: (0, pg_core_1.text)('expo_ticket_id'),
    expoReceiptId: (0, pg_core_1.text)('expo_receipt_id'),
    receiptStatus: (0, pg_core_1.text)('receipt_status'),
    receiptError: (0, pg_core_1.text)('receipt_error'),
    receiptDetails: (0, pg_core_1.jsonb)('receipt_details').$type(),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at'),
    failedAt: (0, pg_core_1.timestamp)('failed_at'),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('notif_deliveries_notification_id_idx').on(t.notificationId),
    (0, pg_core_1.index)('notif_deliveries_push_device_id_idx').on(t.pushDeviceId),
    (0, pg_core_1.index)('notif_deliveries_ticket_idx').on(t.expoTicketId),
    (0, pg_core_1.index)('notif_deliveries_receipt_idx').on(t.expoReceiptId),
]);
//# sourceMappingURL=expo.schema.js.map