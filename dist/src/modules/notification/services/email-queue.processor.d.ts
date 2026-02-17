import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { AnnouncementNotificationService } from './announcement-notification.service';
import { NotificationDeliveryService } from '../notification-delivery.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly employeeInvitationService;
    private readonly goalNotificationService;
    private readonly announcementNotificationService;
    private readonly notificationDeliveryService;
    private readonly logger;
    constructor(employeeInvitationService: EmployeeInvitationService, goalNotificationService: GoalNotificationService, announcementNotificationService: AnnouncementNotificationService, notificationDeliveryService: NotificationDeliveryService);
    onReady(): void;
    onFailed(job: Job, err: Error): void;
    onCompleted(job: Job): void;
    process(job: Job): Promise<void>;
}
