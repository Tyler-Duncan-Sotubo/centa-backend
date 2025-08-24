import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly employeeInvitationService;
    private readonly goalNotificationService;
    constructor(employeeInvitationService: EmployeeInvitationService, goalNotificationService: GoalNotificationService);
    process(job: Job): Promise<void>;
    private handleEmployeeInvitationEmail;
    private handleGoalCheckin;
}
