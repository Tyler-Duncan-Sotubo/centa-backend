import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { BullModule } from '@nestjs/bullmq';
import { PasswordResetEmailService } from './services/password-reset.service';
import { InvitationService } from './services/invitation.service';
import { EmailVerificationService } from './services/email-verification.service';
import { EmployeeInvitationService } from './services/employee-invitation.service';
import { PusherService } from './services/pusher.service';
import { PayrollApprovalEmailService } from './services/payroll-approval.service';
import { GoalNotificationService } from './services/goal-notification.service';
import { PushNotificationService } from './services/push-notification.service';
import { ContactEmailService } from './services/contact-email.service';
import { NewsletterEmailService } from './services/newsletter-email.service';
import { AnnouncementNotificationService } from './services/announcement-notification.service';
import { EmailQueueProcessor } from './services/email-queue.processor';
import { LeaveNotificationService } from './services/leave-notification.service';
import { AssetNotificationService } from './services/asset-notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationEngineService } from './notification-engine.service';
import { NotificationPlannerCron } from './cron/notification-planner.cron';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [NotificationController],
  providers: [
    EmailQueueProcessor,
    NotificationPlannerCron,
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    PusherService,
    PayrollApprovalEmailService,
    GoalNotificationService,
    PushNotificationService,
    ContactEmailService,
    NewsletterEmailService,
    AnnouncementNotificationService,
    LeaveNotificationService,
    AssetNotificationService,
    NotificationDeliveryService,
    NotificationEngineService,
  ],
  exports: [
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    PusherService,
    PayrollApprovalEmailService,
    GoalNotificationService,
    PushNotificationService,
    LeaveNotificationService,
    AssetNotificationService,
  ],
})
export class NotificationModule {}
