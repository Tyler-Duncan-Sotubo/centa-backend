import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { NewsletterEmailService } from './newsletter-email.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly employeeInvitationService;
    private readonly goalNotificationService;
    private readonly newsletterEmailService;
    constructor(employeeInvitationService: EmployeeInvitationService, goalNotificationService: GoalNotificationService, newsletterEmailService: NewsletterEmailService);
    process(job: Job): Promise<void>;
    private handleEmployeeInvitationEmail;
    private handleGoalCheckin;
    private handleSendNewsletter;
}
