// src/modules/notification/services/notification-delivery.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { eq } from 'drizzle-orm';

import { NotificationEngineService } from './notification-engine.service';
import { GoalNotificationService } from './services/goal-notification.service';
import { AnnouncementNotificationService } from './services/announcement-notification.service';
import { notificationEvents } from './schema/notification-events.schema';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly engine: NotificationEngineService,
    private readonly goalNotification: GoalNotificationService,
    private readonly announcementNotification: AnnouncementNotificationService,
    private readonly assessmentNotification: AnnouncementNotificationService, // (rename later)
  ) {}

  async deliver(notificationEventId: string) {
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
      .from(notificationEvents)
      .where(eq(notificationEvents.id, notificationEventId))
      .limit(1);

    if (!ev) {
      this.logger.warn({
        op: 'notif.delivery.not_found',
        notificationEventId,
      });
      return;
    }

    let payload: any = {};
    try {
      payload = ev.payload ? JSON.parse(ev.payload) : {};
    } catch (e: any) {
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
    } catch (err: any) {
      this.logger.error(
        {
          op: 'notif.delivery.failed',
          eventId: ev.id,
          eventType: ev.eventType,
          errorMessage: err?.message,
        },
        err?.stack,
      );
      await this.engine.markFailed(ev.id, err);
      throw err;
    }
  }
}
