import { Global, Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { CoreModule } from './core/core.module';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { LeaveModule } from './leave/leave.module';
import { CompanySettingsModule } from 'src/company-settings/company-settings.module';
import { HolidaysModule } from 'src/modules/leave/holidays/holidays.module';
import { CacheModule } from 'src/common/cache/cache.module';
import { TimeModule } from './time/time.module';
import { PayrollModule } from './payroll/payroll.module';
import { BenefitsModule } from './benefits/benefits.module';
import { ExpensesModule } from './expenses/expenses.module';
import { AssetsModule } from './assets/assets.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { ExportCleanupService } from 'src/common/services/export-clean.service';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SeederModule } from './seed/seeder.module';

@Global()
@Module({
  providers: [ExportCleanupService],
  imports: [
    CoreModule,
    AuditModule,
    AuthModule,
    NotificationModule,
    DrizzleModule,
    LeaveModule,
    CompanySettingsModule,
    HolidaysModule,
    CacheModule,
    TimeModule,
    PayrollModule,
    BenefitsModule,
    ExpensesModule,
    AssetsModule,
    AnnouncementModule,
    RecruitmentModule,
    IntegrationsModule,
    SeederModule,
  ],
  exports: [
    CoreModule,
    AuditModule,
    AuthModule,
    NotificationModule,
    DrizzleModule,
    LeaveModule,
    CompanySettingsModule,
    HolidaysModule,
    CacheModule,
    TimeModule,
    PayrollModule,
    BenefitsModule,
    ExpensesModule,
    AssetsModule,
    AnnouncementModule,
    RecruitmentModule,
    IntegrationsModule,
    SeederModule,
  ],
})
export class ModulesModule {}
