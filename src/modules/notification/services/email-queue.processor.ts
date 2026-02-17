import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, WorkerOptions } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmployeeInvitationService } from './employee-invitation.service';
import { GoalNotificationService } from './goal-notification.service';
import { AnnouncementNotificationService } from './announcement-notification.service';
import { NotificationDeliveryService } from '../notification-delivery.service';

@Processor('emailQueue', {
  concurrency: 5,
  limiter: {
    max: 30,
    duration: 1000,
  },
} as WorkerOptions)
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    private readonly employeeInvitationService: EmployeeInvitationService,
    private readonly goalNotificationService: GoalNotificationService,
    private readonly announcementNotificationService: AnnouncementNotificationService,
    private readonly notificationDeliveryService: NotificationDeliveryService,
  ) {
    super();
    this.logger.warn({
      op: 'email.worker.boot',
      pid: process.pid,
      queue: 'emailQueue',
    });
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.warn({ op: 'email.worker.ready', queue: 'emailQueue' });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      {
        op: 'email.worker.failed',
        queue: 'emailQueue',
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
        err: err?.message,
      },
      err?.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log({
      op: 'email.worker.completed',
      queue: 'emailQueue',
      jobId: job?.id,
      jobName: job?.name,
    });
  }

  async process(job: Job): Promise<void> {
    const { id, name, attemptsMade, opts, data } = job;

    this.logger.log({
      op: 'email.worker.got_job',
      queue: job.queueName,
      jobId: id,
      jobName: name,
      attemptsMade,
      maxAttempts: opts?.attempts,
      data,
    });

    try {
      this.logger.log({
        op: 'email.worker.route',
        jobId: id,
        jobName: name,
      });

      switch (name) {
        case 'sendPasswordResetEmail':
          await this.employeeInvitationService.sendInvitationEmail(
            data.email,
            data.name,
            data.companyName,
            data.role,
            data.resetLink,
          );
          break;

        case 'sendGoalCheckin':
          await this.goalNotificationService.sendGoalCheckin(data);
          break;

        case 'sendAnnouncement':
          await this.announcementNotificationService.sendNewAnnouncement(data);
          break;

        case 'sendNotificationEvent':
          this.logger.log({
            op: 'email.worker.route.sendNotificationEvent',
            jobId: id,
            data,
          });

          if (!data?.notificationEventId) {
            this.logger.error({
              op: 'email.worker.sendNotificationEvent.missing_event_id',
              jobId: id,
              jobName: name,
              data,
            });
            throw new Error('notificationEventId missing from job.data');
          }

          await this.notificationDeliveryService.deliver(
            data.notificationEventId,
          );
          break;

        default:
          this.logger.warn({
            op: 'email.worker.unhandled',
            jobId: id,
            jobName: name,
          });
          return;
      }

      this.logger.log({
        op: 'email.worker.success',
        queue: job.queueName,
        jobId: id,
        jobName: name,
      });
    } catch (error: any) {
      this.logger.error(
        {
          op: 'email.worker.process_failed',
          queue: job.queueName,
          jobId: id,
          jobName: name,
          attemptsMade,
          willRetry: attemptsMade < (opts?.attempts ?? 1),
          errorMessage: error?.message,
        },
        error?.stack,
      );
      throw error;
    }
  }
}
