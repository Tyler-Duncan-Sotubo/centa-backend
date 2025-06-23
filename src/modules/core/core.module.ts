import { Module } from '@nestjs/common';
import { CompanyModule } from './company/company.module';
import { DepartmentModule } from './department/department.module';
import { CostCentersModule } from './cost-centers/cost-centers.module';
import { JobRolesModule } from './job-roles/job-roles.module';
import { EmployeesModule } from './employees/employees.module';
import { OrgChartModule } from './org-chart/org-chart.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';

@Module({
  controllers: [],
  providers: [],
  imports: [
    CompanyModule,
    DepartmentModule,
    CostCentersModule,
    JobRolesModule,
    EmployeesModule,
    OrgChartModule,
    LifecycleModule,
  ],
  exports: [
    CompanyModule,
    DepartmentModule,
    CostCentersModule,
    JobRolesModule,
    EmployeesModule,
    OrgChartModule,
  ],
})
export class CoreModule {}
