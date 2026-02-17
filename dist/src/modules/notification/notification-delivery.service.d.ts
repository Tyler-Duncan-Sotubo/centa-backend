import { db } from 'src/drizzle/types/drizzle';
import { NotificationEngineService } from './notification-engine.service';
import { GoalNotificationService } from './services/goal-notification.service';
import { AnnouncementNotificationService } from './services/announcement-notification.service';
export declare class NotificationDeliveryService {
    private readonly db;
    private readonly engine;
    private readonly goalNotification;
    private readonly announcementNotification;
    private readonly assessmentNotification;
    private readonly logger;
    constructor(db: db, engine: NotificationEngineService, goalNotification: GoalNotificationService, announcementNotification: AnnouncementNotificationService, assessmentNotification: AnnouncementNotificationService);
    deliver(notificationEventId: string): Promise<void>;
}
