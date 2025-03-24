import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PasswordResetEmailService } from './password-reset.service';

@Processor('emailQueue')
export class EmailQueueProcessor extends WorkerHost {
  constructor(
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case 'sendPasswordResetEmail':
          await this.handlePasswordResetEmail(job.data);
          break;

        default:
          console.warn(`⚠️ Unhandled email job: ${job.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process email job (${job.name}):`, error);
      throw error;
    }
  }

  private async handlePasswordResetEmail(data: any) {
    const { email, name, resetLink } = data;
    await this.passwordResetEmailService.sendPasswordResetEmail(
      email,
      name,
      resetLink,
    );
  }
}
