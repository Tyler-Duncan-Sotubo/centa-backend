import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { ProfileModule } from './profile/profile.module';
import { DependentsModule } from './dependents/dependents.module';
import { HistoryModule } from './history/history.module';
import { CertificationsModule } from './certifications/certifications.module';
import { FinanceModule } from './finance/finance.module';
import { CompensationModule } from './compensation/compensation.module';
import { GroupsModule } from './groups/groups.module';
import { PermissionsService } from 'src/modules/auth/permissions/permissions.service';
import { OnboardingService } from 'src/modules/lifecycle/onboarding/onboarding.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeesService, PermissionsService, OnboardingService],
  imports: [
    ProfileModule,
    DependentsModule,
    HistoryModule,
    CertificationsModule,
    FinanceModule,
    CompensationModule,
    GroupsModule,
  ],
  exports: [
    EmployeesService,
    ProfileModule,
    DependentsModule,
    HistoryModule,
    CertificationsModule,
    FinanceModule,
    CompensationModule,
    GroupsModule,
  ],
})
export class EmployeesModule {}
