import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PasswordResetEmailService } from './password-reset.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly passwordResetEmailService;
    constructor(passwordResetEmailService: PasswordResetEmailService);
    process(job: Job): Promise<void>;
    private handlePasswordResetEmail;
}
