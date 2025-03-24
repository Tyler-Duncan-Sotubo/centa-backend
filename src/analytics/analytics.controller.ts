import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorator/current-user.decorator';
import { User } from 'src/types/user.type';
import { BaseController } from 'src/config/base.controller';

@Controller('')
export class AnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  @Get('payroll-overview')
  getPayrollOverview(@CurrentUser() user: User) {
    return this.analyticsService.getPayrollOverview(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  @Get('employee-salary-breakdown')
  employeeSalaryBreakdown(@CurrentUser() user: User) {
    return this.analyticsService.employeesSalaryBreakdown(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  @Get('finance-report')
  payrollTrendsOverview(@CurrentUser() user: User) {
    return this.analyticsService.getCompanyFinanceReport(user.company_id);
  }

  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin', 'hr_manager'])
  @Get('deduction-report')
  deductionReport(@CurrentUser() user: User) {
    return this.analyticsService.getDeductionsReport(user.company_id);
  }
}
