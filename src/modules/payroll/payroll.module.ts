import { Module } from '@nestjs/common';
import { PayrollSettingsService } from './settings/payroll-settings.service';
import { RunModule } from './run/run.module';
import { PaySchedulesModule } from './pay-schedules/pay-schedules.module';
import { PayGroupsModule } from './pay-groups/pay-groups.module';
import { DeductionsModule } from './deductions/deductions.module';
import { BonusesModule } from './bonuses/bonuses.module';
import { AllowancesModule } from './allowances/allowances.module';
import { ReportModule } from './report/report.module';
import { PayrollSettingsController } from './settings/payroll-settings.controller';
import { PayslipModule } from './payslip/payslip.module';
import { TaxModule } from './tax/tax.module';
import { PayrollProcessor } from './payroll.processor';
import { PdfService } from 'src/common/services/pdf.service';
import { BullModule } from '@nestjs/bullmq';
import { AwsService } from 'src/common/aws/aws.service';
import { PayrollOverridesModule } from './payroll-overrides/payroll-overrides.module';
import { PayrollAdjustmentsModule } from './payroll-adjustments/payroll-adjustments.module';
import { SalaryAdvanceModule } from './salary-advance/salary-advance.module';
import { OffCycleModule } from './off-cycle/off-cycle.module';

@Module({
  providers: [PayrollSettingsService, PayrollProcessor, PdfService, AwsService],
  exports: [
    PayrollSettingsService,
    RunModule,
    PaySchedulesModule,
    PayGroupsModule,
    DeductionsModule,
    BonusesModule,
    AllowancesModule,
    ReportModule,
    PayslipModule,
    TaxModule,
    PayrollProcessor,
    PdfService,
    AwsService,
  ],
  imports: [
    BullModule.registerQueue({
      name: 'payrollQueue',
    }),
    RunModule,
    PaySchedulesModule,
    PayGroupsModule,
    DeductionsModule,
    BonusesModule,
    AllowancesModule,
    ReportModule,
    PayslipModule,
    TaxModule,
    PayrollOverridesModule,
    PayrollAdjustmentsModule,
    SalaryAdvanceModule,
    OffCycleModule,
  ],
  controllers: [PayrollSettingsController],
})
export class PayrollModule {}
