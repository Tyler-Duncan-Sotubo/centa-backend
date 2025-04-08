import { Module } from '@nestjs/common';
import { PayrollService } from './services/payroll.service';
import { PayrollController } from './payroll.controller';
import { LoanController } from './loan.controller';
import { BullModule } from '@nestjs/bullmq';
import { PayrollProcessor } from './payroll.processor';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { PayslipService } from './services/payslip.service';
import { DeductionService } from './services/deduction.service';
import { CacheModule } from 'src/config/cache/cache.module';
import { CacheService } from 'src/config/cache/cache.service';
import { AwsService } from 'src/config/aws/aws.service';
import { TaxService } from './services/tax.service';
import { PdfService } from './services/pdf.service';
import { LoanService } from './services/loan.service';
import { PusherService } from 'src/notification/services/pusher.service';
import { OnboardingService } from 'src/organization/services/onboarding.service';
import { PayGroupService } from './services/pay-group.service';
import { AuditService } from 'src/audit/audit.service';
import { PrimaryGuard } from 'src/auth/guards/primary.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    CacheModule,
    DrizzleModule,
    BullModule.registerQueue({
      name: 'payrollQueue',
    }),
  ],
  controllers: [PayrollController, LoanController],
  providers: [
    PayrollService,
    PayrollProcessor,
    PayslipService,
    DeductionService,
    CacheService,
    AwsService,
    TaxService,
    PdfService,
    LoanService,
    PusherService,
    OnboardingService,
    PayGroupService,
    AuditService,
    PrimaryGuard,
    JwtService,
  ],
})
export class PayrollModule {}
