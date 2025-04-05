import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { CompanyService, EmployeeService, DepartmentService } from './services';
import { MulterModule } from '@nestjs/platform-express';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
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
  controllers: [OrganizationController],
  providers: [
    JwtGuard,
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
  ],
})
export class OrganizationModule {}
