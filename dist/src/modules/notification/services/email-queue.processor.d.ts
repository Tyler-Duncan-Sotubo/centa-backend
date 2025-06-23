import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly employeeInvitationService;
    constructor(employeeInvitationService: EmployeeInvitationService);
    process(job: Job): Promise<void>;
    private handleEmployeeInvitationEmail;
}
