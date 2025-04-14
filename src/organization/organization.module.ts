import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { CompanyService, EmployeeService, DepartmentService } from './services';
import { MulterModule } from '@nestjs/platform-express';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { CacheModule } from 'src/config/cache/cache.module';
import { CacheService } from 'src/config/cache/cache.service';
import { AwsService } from 'src/config/aws/aws.service';
import { PasswordResetService } from 'src/auth/services';
import { PasswordResetEmailService } from 'src/notification/services/password-reset.service';
import { EmployeeInvitationService } from 'src/notification/services/employee-invitation.service';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { OnboardingService } from './services/onboarding.service';
import { EmailQueueProcessor } from 'src/notification/services/email-queue.processor';
import { BullModule } from '@nestjs/bullmq';
import { AuditService } from 'src/audit/audit.service';
import { PrimaryGuard } from 'src/auth/guards/primary.guard';
import { AttendanceService } from './services/attendance.service';
import { LeaveAttendanceController } from './leave-attendance.controller';
import { LeaveService } from './services/leave.service';
import { AttendanceSchedulerService } from './services/attendance-scheduler.service';
import { PusherService } from 'src/notification/services/pusher.service';
@Module({
  imports: [
    AuthModule,
    DrizzleModule,
    CacheModule,
    MulterModule.register({
      dest: './src/organization/temp', // Directory for storing uploaded files
    }),
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
  ],
  controllers: [OrganizationController, LeaveAttendanceController],
  providers: [
    PrimaryGuard,
    CompanyService,
    EmployeeService,
    DepartmentService,
    CacheService,
    AwsService,
    PasswordResetService,
    EmployeeInvitationService,
    PasswordResetEmailService,
    JwtService,
    OnboardingService,
    EmailQueueProcessor,
    AuditService,
    AttendanceService,
    LeaveService,
    AttendanceSchedulerService,
    PusherService,
  ],
})
export class OrganizationModule {}
