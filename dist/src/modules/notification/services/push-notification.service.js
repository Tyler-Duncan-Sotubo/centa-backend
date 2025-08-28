"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PushNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
const expo_server_sdk_1 = require("expo-server-sdk");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const expo_schema_1 = require("../schema/expo.schema");
let PushNotificationService = PushNotificationService_1 = class PushNotificationService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger(PushNotificationService_1.name);
        this.expo = new expo_server_sdk_1.Expo();
    }
    async saveToken(employeeId, token, companyId, meta) {
        const emp = await this.db
            .select()
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .execute();
        if (!emp.length)
            throw new common_1.BadRequestException('Employee not found');
        if (!expo_server_sdk_1.Expo.isExpoPushToken(token)) {
            throw new common_1.BadRequestException('Invalid Expo push token');
        }
        const existing = await this.db
            .select()
            .from(expo_schema_1.expoPushDevices)
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.expoPushToken, token))
            .execute();
        if (existing.length) {
            await this.db
                .update(expo_schema_1.expoPushDevices)
                .set({
                employeeId,
                companyId,
                platform: meta?.platform ?? 'unknown',
                deviceId: meta?.deviceId ?? null,
                appVersion: meta?.appVersion ?? null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.expoPushToken, token))
                .execute();
        }
        else {
            await this.db
                .insert(expo_schema_1.expoPushDevices)
                .values({
                employeeId,
                companyId,
                expoPushToken: token,
                platform: meta?.platform ?? 'unknown',
                deviceId: meta?.deviceId ?? null,
                appVersion: meta?.appVersion ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .execute();
        }
        return { success: true, message: 'Token saved successfully' };
    }
    async deleteToken(token) {
        await this.db
            .delete(expo_schema_1.expoPushDevices)
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.expoPushToken, token))
            .execute();
        return { success: true };
    }
    async getEmployeeUnreadCount(employeeId) {
        const [row] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `cast(count(*) as int)` })
            .from(expo_schema_1.expo_notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.employeeId, employeeId), (0, drizzle_orm_1.isNull)(expo_schema_1.expo_notifications.readAt), (0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.isArchived, false)))
            .execute();
        return row?.count ?? 0;
    }
    async createAndSendToEmployee(employeeId, dto) {
        const { title, body, type, route, data = {}, url } = dto;
        const [created] = await this.db
            .insert(expo_schema_1.expo_notifications)
            .values({
            employeeId,
            title,
            body: body ?? null,
            type,
            route: route ?? null,
            data,
            url: url ?? null,
        })
            .returning({ id: expo_schema_1.expo_notifications.id })
            .execute();
        const notifId = created.id;
        const unread = await this.getEmployeeUnreadCount(employeeId);
        const rows = await this.db
            .select({
            id: expo_schema_1.expoPushDevices.id,
            token: expo_schema_1.expoPushDevices.expoPushToken,
            platform: expo_schema_1.expoPushDevices.platform,
        })
            .from(expo_schema_1.expoPushDevices)
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.employeeId, employeeId))
            .execute();
        const tokens = Array.from(new Set(rows.map((r) => r.token).filter((t) => expo_server_sdk_1.Expo.isExpoPushToken(t))));
        if (tokens.length) {
            await this.sendToTokens(tokens, {
                title,
                body: body ?? '',
                data: {
                    route,
                    params: data ?? {},
                    notificationId: notifId,
                    ...data,
                    id: data?.id,
                },
                badge: unread,
            }, { notificationId: notifId, deviceRows: rows });
        }
        return { id: notifId };
    }
    async createAndSendToCompany(companyId, dto, opts) {
        const { title, body, type, route, data = {}, url } = dto;
        let targetEmployeeIds;
        if (opts?.employeeIds?.length) {
            targetEmployeeIds = Array.from(new Set(opts.employeeIds));
        }
        else {
            const deviceEmployees = await this.db
                .select({ employeeId: expo_schema_1.expoPushDevices.employeeId })
                .from(expo_schema_1.expoPushDevices)
                .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.companyId, companyId))
                .execute();
            targetEmployeeIds = Array.from(new Set(deviceEmployees.map((r) => r.employeeId)));
        }
        if (targetEmployeeIds.length === 0) {
            return { created: 0, sentTo: 0, recipients: [] };
        }
        const rowsToInsert = targetEmployeeIds.map((employeeId) => ({
            employeeId,
            title,
            body: body ?? null,
            type,
            route: route ?? null,
            data,
            url: url ?? null,
        }));
        const created = await this.db
            .insert(expo_schema_1.expo_notifications)
            .values(rowsToInsert)
            .returning({
            id: expo_schema_1.expo_notifications.id,
            employeeId: expo_schema_1.expo_notifications.employeeId,
        })
            .execute();
        const notifIdByEmployee = new Map();
        for (const row of created)
            notifIdByEmployee.set(row.employeeId, row.id);
        const unreadRows = await this.db
            .select({
            employeeId: expo_schema_1.expo_notifications.employeeId,
            count: (0, drizzle_orm_1.sql) `count(*)`,
        })
            .from(expo_schema_1.expo_notifications)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(expo_schema_1.expo_notifications.employeeId, targetEmployeeIds), (0, drizzle_orm_1.isNull)(expo_schema_1.expo_notifications.readAt)))
            .groupBy(expo_schema_1.expo_notifications.employeeId)
            .execute();
        const unreadByEmployee = new Map();
        for (const u of unreadRows)
            unreadByEmployee.set(u.employeeId, Number(u.count));
        const deviceRows = await this.db
            .select({
            id: expo_schema_1.expoPushDevices.id,
            token: expo_schema_1.expoPushDevices.expoPushToken,
            platform: expo_schema_1.expoPushDevices.platform,
            employeeId: expo_schema_1.expoPushDevices.employeeId,
        })
            .from(expo_schema_1.expoPushDevices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.companyId, companyId), (0, drizzle_orm_1.inArray)(expo_schema_1.expoPushDevices.employeeId, targetEmployeeIds)))
            .execute();
        const tokensByEmployee = new Map();
        for (const { employeeId, token } of deviceRows) {
            if (!expo_server_sdk_1.Expo.isExpoPushToken(token))
                continue;
            const arr = tokensByEmployee.get(employeeId) ?? [];
            if (!arr.includes(token))
                arr.push(token);
            tokensByEmployee.set(employeeId, arr);
        }
        let totalDevices = 0;
        for (const employeeId of targetEmployeeIds) {
            const tokens = tokensByEmployee.get(employeeId) ?? [];
            if (!tokens.length)
                continue;
            totalDevices += tokens.length;
            const notifId = notifIdByEmployee.get(employeeId);
            const badge = unreadByEmployee.get(employeeId) ?? 0;
            await this.sendToTokens(tokens, {
                title,
                body: body ?? '',
                data: {
                    route,
                    params: data ?? {},
                    notificationId: notifId,
                    ...data,
                    id: data?.id,
                },
                badge,
            }, {
                notificationId: notifId,
                deviceRows: deviceRows.filter((d) => d.employeeId === employeeId),
            });
        }
        return {
            created: created.length,
            sentTo: totalDevices,
            recipients: targetEmployeeIds,
        };
    }
    async getNotificationsForEmployee(employeeId) {
        const status = 'unread';
        const whereClause = status === 'unread'
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.employeeId, employeeId), (0, drizzle_orm_1.isNull)(expo_schema_1.expo_notifications.readAt), (0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.isArchived, false))
            : (0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.employeeId, employeeId);
        const rows = await this.db
            .select()
            .from(expo_schema_1.expo_notifications)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(expo_schema_1.expo_notifications.createdAt))
            .limit(10)
            .execute();
        return rows;
    }
    async getUnreadCount(employeeId) {
        const count = await this.getEmployeeUnreadCount(employeeId);
        return { count };
    }
    async markRead(notificationId) {
        await this.db
            .update(expo_schema_1.expo_notifications)
            .set({ readAt: new Date() })
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.id, notificationId))
            .execute();
        return { success: true };
    }
    async markAllRead(employeeId) {
        await this.db
            .update(expo_schema_1.expo_notifications)
            .set({ readAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.employeeId, employeeId), (0, drizzle_orm_1.isNull)(expo_schema_1.expo_notifications.readAt)))
            .execute();
        const count = await this.getEmployeeUnreadCount(employeeId);
        return { success: true, unreadCount: count };
    }
    async archive(notificationId, employeeId) {
        await this.db
            .update(expo_schema_1.expo_notifications)
            .set({ isArchived: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.id, notificationId), (0, drizzle_orm_1.eq)(expo_schema_1.expo_notifications.employeeId, employeeId)))
            .execute();
        return { success: true };
    }
    async sendPushNotification(employee_id, title, body, data = {}) {
        const rows = await this.db
            .select()
            .from(expo_schema_1.expoPushDevices)
            .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.employeeId, employee_id))
            .execute();
        if (!rows.length)
            return;
        const tokens = Array.from(new Set(rows.map((r) => r.expoPushToken).filter((t) => expo_server_sdk_1.Expo.isExpoPushToken(t))));
        if (!tokens.length)
            return;
        await this.sendToTokens(tokens, { title, body, data });
    }
    async sendToEmployees(employeeIds, title, body, data) {
        if (!employeeIds.length)
            return;
        const rows = await this.db
            .select({ token: expo_schema_1.expoPushDevices.expoPushToken })
            .from(expo_schema_1.expoPushDevices)
            .where((0, drizzle_orm_1.inArray)(expo_schema_1.expoPushDevices.employeeId, employeeIds))
            .execute();
        const tokens = Array.from(new Set(rows.map((r) => r.token).filter((t) => expo_server_sdk_1.Expo.isExpoPushToken(t))));
        if (tokens.length) {
            await this.sendToTokens(tokens, { title, body, data });
        }
    }
    async sendToTokens(tokens, payload, audit) {
        if (!tokens.length)
            return;
        const messages = tokens.map((to) => ({
            to,
            sound: 'default',
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            badge: payload.badge,
        }));
        const chunks = this.expo.chunkPushNotifications(messages);
        const ticketToToken = new Map();
        const allTickets = [];
        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                allTickets.push(...ticketChunk);
                ticketChunk.forEach((ticket, idx) => {
                    const token = chunk[idx]?.to;
                    if (ticket.status === 'ok' && ticket.id && token) {
                        ticketToToken.set(ticket.id, token);
                    }
                });
            }
            catch (error) {
                this.logger.error('Error sending push notifications', error);
            }
        }
        if (audit?.notificationId && audit?.deviceRows?.length) {
            const items = Array.from(ticketToToken.entries())
                .map(([ticketId, token]) => {
                const device = audit.deviceRows.find((d) => d.token === token);
                return device
                    ? {
                        notificationId: audit.notificationId,
                        pushDeviceId: device.id,
                        expoTicketId: ticketId,
                        sentAt: new Date(),
                    }
                    : undefined;
            })
                .filter(Boolean);
            if (items.length) {
                try {
                    await this.db
                        .insert(expo_schema_1.expo_notificationDeliveries)
                        .values(items)
                        .execute();
                }
                catch (e) {
                    this.logger.warn('Failed to persist notification deliveries', e);
                }
            }
        }
        const ticketIds = allTickets
            .map((t) => (t.status === 'ok' ? t.id : null))
            .filter(Boolean);
        if (ticketIds.length) {
            await this.checkReceiptsAndPrune(ticketIds, ticketToToken);
        }
    }
    async checkReceiptsAndPrune(ticketIds, ticketToToken) {
        const receiptChunks = this.expo.chunkPushNotificationReceiptIds(ticketIds);
        for (const chunk of receiptChunks) {
            try {
                const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
                for (const [id, receipt] of Object.entries(receipts)) {
                    if (receipt.status === 'ok')
                        continue;
                    this.logger.warn(`Expo receipt error for ticket ${id}: ${receipt.message}`);
                    const code = receipt?.details?.error;
                    if (code === 'DeviceNotRegistered') {
                        const token = ticketToToken?.get(id);
                        if (token) {
                            await this.db
                                .delete(expo_schema_1.expoPushDevices)
                                .where((0, drizzle_orm_1.eq)(expo_schema_1.expoPushDevices.expoPushToken, token))
                                .execute();
                            this.logger.warn(`Pruned unregistered token: ${token}`);
                        }
                        else {
                            this.logger.warn('DeviceNotRegistered but token unknown (no audit mapping)');
                        }
                    }
                }
            }
            catch (error) {
                this.logger.error('Error fetching receipts', error);
            }
        }
    }
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = PushNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], PushNotificationService);
//# sourceMappingURL=push-notification.service.js.map