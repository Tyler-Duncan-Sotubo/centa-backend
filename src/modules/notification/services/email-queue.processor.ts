import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { AnnouncementNotificationService } from './announcement-notification.service';

@Processor('emailQueue')
export class EmailQueueProcessor extends WorkerHost {
  constructor(
    private readonly employeeInvitationService: EmployeeInvitationService,
    private readonly goalNotificationService: GoalNotificationService,
    private readonly announcementNotificationService: AnnouncementNotificationService,
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

        case 'sendAnnouncement':
          await this.handleAnnouncement(job.data);
          break;

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

  private async handleAnnouncement(data: any) {
    await this.announcementNotificationService.sendNewAnnouncement(data);
  }
}
