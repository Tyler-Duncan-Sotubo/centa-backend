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
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { OnboardingService } from './services/onboarding.service';

@Module({
  imports: [
    AuthModule,
    DrizzleModule,
    CacheModule,
    MulterModule.register({
      dest: './src/organization/temp', // Directory for storing uploaded files
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
    PasswordResetEmailService,
    JwtService,
    OnboardingService,
  ],
})
export class OrganizationModule {}
