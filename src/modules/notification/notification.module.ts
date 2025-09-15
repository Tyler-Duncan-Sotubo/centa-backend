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
import { EmailQueueService } from './services/email-queue.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [NotificationController],
  providers: [
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
    EmailQueueService,
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
  ],
})
export class NotificationModule {}
