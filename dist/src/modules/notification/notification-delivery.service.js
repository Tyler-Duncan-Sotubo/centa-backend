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
var NotificationDeliveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDeliveryService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const notification_engine_service_1 = require("./notification-engine.service");
const goal_notification_service_1 = require("./services/goal-notification.service");
const announcement_notification_service_1 = require("./services/announcement-notification.service");
const notification_events_schema_1 = require("./schema/notification-events.schema");
let NotificationDeliveryService = NotificationDeliveryService_1 = class NotificationDeliveryService {
    constructor(db, engine, goalNotification, announcementNotification, assessmentNotification) {
        this.db = db;
        this.engine = engine;
        this.goalNotification = goalNotification;
        this.announcementNotification = announcementNotification;
        this.assessmentNotification = assessmentNotification;
        this.logger = new common_1.Logger(NotificationDeliveryService_1.name);
    }
    async deliver(notificationEventId) {
        this.logger.log({
            op: 'notif.delivery.start',
            notificationEventId,
        });
        if (!notificationEventId) {
            this.logger.error({
                op: 'notif.delivery.bad_input',
                reason: 'notificationEventId missing',
            });
            return;
        }
        const [ev] = await this.db
            .select()
            .from(notification_events_schema_1.notificationEvents)
            .where((0, drizzle_orm_1.eq)(notification_events_schema_1.notificationEvents.id, notificationEventId))
            .limit(1);
        if (!ev) {
            this.logger.warn({
                op: 'notif.delivery.not_found',
                notificationEventId,
            });
            return;
        }
        let payload = {};
        try {
            payload = ev.payload ? JSON.parse(ev.payload) : {};
        }
        catch (e) {
            this.logger.error({
                op: 'notif.delivery.payload.parse_failed',
                notificationEventId,
                errorMessage: e?.message,
            });
            await this.engine.markFailed(ev.id, e);
            throw e;
        }
        this.logger.log({
            op: 'notif.delivery.event.loaded',
            eventId: ev.id,
            eventType: ev.eventType,
            status: ev.status,
            recipientEmail: ev.recipientEmail,
            entityType: ev.entityType,
            entityId: ev.entityId,
        });
        try {
            this.logger.log({
                op: 'notif.delivery.route',
                eventType: ev.eventType,
            });
            switch (ev.eventType) {
                case 'goal_due_t7':
                case 'goal_due_t2':
                case 'goal_due_today':
                case 'goal_overdue':
                    this.logger.log({ op: 'notif.delivery.send.goal', eventId: ev.id });
                    await this.goalNotification.sendGoalCheckin(payload);
                    break;
                case 'assessment_t14':
                case 'assessment_t7':
                case 'assessment_t2':
                case 'assessment_due_today':
                case 'assessment_overdue':
                case 'self_submitted_notify_manager':
                    this.logger.log({
                        op: 'notif.delivery.send.assessment',
                        eventId: ev.id,
                    });
                    await this.assessmentNotification.sendAssessmentReminder(payload);
                    break;
                case 'announcement_new':
                    this.logger.log({
                        op: 'notif.delivery.send.announcement',
                        eventId: ev.id,
                    });
                    await this.announcementNotification.sendNewAnnouncement(payload);
                    break;
                default:
                    this.logger.warn({
                        op: 'notif.delivery.unknown_eventType.skip',
                        eventId: ev.id,
                        eventType: ev.eventType,
                    });
                    break;
            }
            await this.engine.markSent(ev.id);
            this.logger.log({
                op: 'notif.delivery.success',
                eventId: ev.id,
                eventType: ev.eventType,
            });
        }
        catch (err) {
            this.logger.error({
                op: 'notif.delivery.failed',
                eventId: ev.id,
                eventType: ev.eventType,
                errorMessage: err?.message,
            }, err?.stack);
            await this.engine.markFailed(ev.id, err);
            throw err;
        }
    }
};
exports.NotificationDeliveryService = NotificationDeliveryService;
exports.NotificationDeliveryService = NotificationDeliveryService = NotificationDeliveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, notification_engine_service_1.NotificationEngineService,
        goal_notification_service_1.GoalNotificationService,
        announcement_notification_service_1.AnnouncementNotificationService,
        announcement_notification_service_1.AnnouncementNotificationService])
], NotificationDeliveryService);
//# sourceMappingURL=notification-delivery.service.js.map