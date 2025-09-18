import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { AnnouncementNotificationService } from './announcement-notification.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly employeeInvitationService;
    private readonly goalNotificationService;
    private readonly announcementNotificationService;
    constructor(employeeInvitationService: EmployeeInvitationService, goalNotificationService: GoalNotificationService, announcementNotificationService: AnnouncementNotificationService);
    process(job: Job): Promise<void>;
    private handleEmployeeInvitationEmail;
    private handleGoalCheckin;
    private handleAnnouncement;
}
