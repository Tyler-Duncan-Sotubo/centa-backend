import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { AnnouncementNotificationService } from './announcement-notification.service';

@Processor('emailQueue')
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    private readonly employeeInvitationService: EmployeeInvitationService,
    private readonly goalNotificationService: GoalNotificationService,
    private readonly announcementNotificationService: AnnouncementNotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { id, name, attemptsMade, opts } = job;

    this.logger.log({
      op: 'email.job.start',
      jobId: id,
      jobName: name,
      attemptsMade,
      maxAttempts: opts?.attempts,
      queue: job.queueName,
    });

    try {
      switch (name) {
        case 'sendPasswordResetEmail':
          this.logger.debug({
            op: 'email.invite.payload',
            jobId: id,
            email: job.data?.email,
            companyName: job.data?.companyName,
            role: job.data?.role,
          });
          await this.handleEmployeeInvitationEmail(job.data);
          break;

        case 'sendGoalCheckin':
          this.logger.debug({
            op: 'email.goalCheckin.payload',
            jobId: id,
            employeeId: job.data?.employeeId,
            goalId: job.data?.goalId,
          });
          await this.handleGoalCheckin(job.data);
          break;

        case 'sendAnnouncement':
          this.logger.debug({
            op: 'email.announcement.payload',
            jobId: id,
            announcementId: job.data?.announcementId,
          });
          await this.handleAnnouncement(job.data);
          break;

        default:
          this.logger.warn({
            op: 'email.job.unhandled',
            jobId: id,
            jobName: name,
          });
          return;
      }

      this.logger.log({
        op: 'email.job.success',
        jobId: id,
        jobName: name,
      });
    } catch (error: any) {
      this.logger.error(
        {
          op: 'email.job.failed',
          jobId: id,
          jobName: name,
          attemptsMade,
          willRetry: attemptsMade < (opts?.attempts ?? 1),
          errorMessage: error?.message,
        },
        error?.stack,
      );

      throw error; // IMPORTANT: rethrow so BullMQ retries
    }
  }

  private async handleEmployeeInvitationEmail(data: any) {
    const { email, name, companyName, role } = data;

    this.logger.log({
      op: 'email.invite.send',
      email,
      companyName,
      role,
    });

    await this.employeeInvitationService.sendInvitationEmail(
      email,
      name,
      companyName,
      role,
      data.resetLink, // don't log token
    );
  }

  private async handleGoalCheckin(data: any) {
    await this.goalNotificationService.sendGoalCheckin(data);
  }

  private async handleAnnouncement(data: any) {
    await this.announcementNotificationService.sendNewAnnouncement(data);
  }
}
