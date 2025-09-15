import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { NewsletterEmailService } from './newsletter-email.service';
import { NewsletterRecipientDto } from '../dto/newsletter-recipient.dto';

@Processor('emailQueue')
export class EmailQueueProcessor extends WorkerHost {
  constructor(
    private readonly employeeInvitationService: EmployeeInvitationService,
    private readonly goalNotificationService: GoalNotificationService,
    private readonly newsletterEmailService: NewsletterEmailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    try {
      switch (job.name) {
        case 'sendPasswordResetEmail':
          await this.handleEmployeeInvitationEmail(job.data);
          break;

        case 'sendGoalCheckin':
          await this.handleGoalCheckin(job.data);
          break;

        case 'sendNewsletter':
          return this.handleSendNewsletter(job.data);

        default:
          console.warn(`⚠️ Unhandled email job: ${job.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process email job (${job.name}):`, error);
      throw error;
    }
  }

  private async handleEmployeeInvitationEmail(data: any) {
    const { email, name, companyName, role, resetLink } = data;
    await this.employeeInvitationService.sendInvitationEmail(
      email,
      name,
      companyName,
      role,
      resetLink,
    );
  }

  private async handleGoalCheckin(data: any) {
    await this.goalNotificationService.sendGoalCheckin(data);
  }

  private async handleSendNewsletter(data: {
    recipients: NewsletterRecipientDto[];
    campaignName?: string;
    categories?: string[];
  }) {
    await this.newsletterEmailService.sendNewsletter(data.recipients, {
      campaignName: data.campaignName,
      categories: data.categories,
    });
  }
}
