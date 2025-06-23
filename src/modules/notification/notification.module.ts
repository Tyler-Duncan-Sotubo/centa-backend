import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { BullModule } from '@nestjs/bullmq';
import { PasswordResetEmailService } from './services/password-reset.service';
import { InvitationService } from './services/invitation.service';
import { EmailVerificationService } from './services/email-verification.service';
import { EmployeeInvitationService } from './services/employee-invitation.service';
import { PusherService } from './services/pusher.service';

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
  ],
  exports: [
    PasswordResetEmailService,
    InvitationService,
    EmailVerificationService,
    EmployeeInvitationService,
    PusherService,
  ],
})
export class NotificationModule {}
