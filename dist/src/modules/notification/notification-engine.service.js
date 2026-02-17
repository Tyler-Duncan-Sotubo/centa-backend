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
var NotificationEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEngineService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const drizzle_orm_1 = require("drizzle-orm");
const notification_events_schema_1 = require("./schema/notification-events.schema");
let NotificationEngineService = NotificationEngineService_1 = class NotificationEngineService {
    constructor(db, emailQueue) {
        this.db = db;
        this.emailQueue = emailQueue;
        this.logger = new common_1.Logger(NotificationEngineService_1.name);
    }
    async createAndEnqueue(input) {
        const now = new Date();
        this.logger.log({
            op: 'notif.engine.createAndEnqueue.start',
            companyId: input.companyId,
            eventType: input.eventType,
            entityType: input.entityType,
            entityId: input.entityId,
            recipientEmail: input.recipientEmail,
            dedupeKey: input.dedupeKey,
            jobName: input.jobName,
        });
        const payloadStr = input.payload === undefined ? null : JSON.stringify(input.payload);
        const inserted = await this.db
            .insert(notification_events_schema_1.notificationEvents)
            .values({
            companyId: input.companyId,
            channel: input.channel ?? 'email',
            eventType: input.eventType,
            entityType: (input.entityType ?? 'other'),
            entityId: input.entityId ?? null,
            recipientUserId: input.recipientUserId ?? null,
            recipientEmployeeId: input.recipientEmployeeId ?? null,
            recipientEmail: input.recipientEmail ?? null,
            dedupeKey: input.dedupeKey,
            status: 'queued',
            payload: payloadStr,
            queuedAt: now,
        })
            .onConflictDoNothing({ target: notification_events_schema_1.notificationEvents.dedupeKey })
            .returning({
            id: notification_events_schema_1.notificationEvents.id,
            dedupeKey: notification_events_schema_1.notificationEvents.dedupeKey,
        });
        const row = inserted?.[0];
        if (!row) {
            this.logger.warn({
                op: 'notif.engine.deduped.skip',
                dedupeKey: input.dedupeKey,
            });
            return null;
        }
        this.logger.log({
            op: 'notif.engine.db.inserted',
            eventId: row.id,
            dedupeKey: row.dedupeKey,
        });
        await this.emailQueue.add(input.jobName, { notificationEventId: row.id }, {
            jobId: row.dedupeKey,
            attempts: 5,
            backoff: { type: 'exponential', delay: 10_000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
        this.logger.log({
            op: 'notif.engine.enqueued',
            eventId: row.id,
            jobName: input.jobName,
            jobId: row.dedupeKey,
            data: { notificationEventId: row.id },
        });
        return row;
    }
    async markSent(eventId) {
        this.logger.log({ op: 'notif.engine.markSent', eventId });
        await this.db
            .update(notification_events_schema_1.notificationEvents)
            .set({ status: 'sent', sentAt: new Date() })
            .where((0, drizzle_orm_1.eq)(notification_events_schema_1.notificationEvents.id, eventId));
    }
    async markFailed(eventId, error) {
        this.logger.error({
            op: 'notif.engine.markFailed',
            eventId,
            errorMessage: String(error?.message ?? error ?? 'unknown'),
        });
        await this.db
            .update(notification_events_schema_1.notificationEvents)
            .set({
            status: 'failed',
            failedAt: new Date(),
            error: String(error?.message ?? error ?? 'unknown'),
        })
            .where((0, drizzle_orm_1.eq)(notification_events_schema_1.notificationEvents.id, eventId));
    }
};
exports.NotificationEngineService = NotificationEngineService;
exports.NotificationEngineService = NotificationEngineService = NotificationEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_2.InjectQueue)('emailQueue')),
    __metadata("design:paramtypes", [Object, bullmq_1.Queue])
], NotificationEngineService);
//# sourceMappingURL=notification-engine.service.js.map