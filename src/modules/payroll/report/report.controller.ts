import {
  Controller,
  Get,
  Param,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GenerateReportService } from './generate-report.service';
import { BaseController } from 'src/common/interceptor/base.controller';

@Controller('payroll-report')
export class ReportController extends BaseController {
  constructor(
    private readonly reportService: ReportService,
    private readonly generateReportService: GenerateReportService,
  ) {
    super();
  }

  @Get('gl-summary-from-payroll')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getGlSummary(@CurrentUser() user: User, @Query('month') month: string) {
    return this.generateReportService.generateGLSummaryFromPayroll(
      user.companyId,
      month,
    );
  }

  @Get('company-payroll-variance')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getPayrollVariance(@CurrentUser() user: User) {
    return this.reportService.getLatestPayrollSummaryWithVariance(
      user.companyId,
    );
  }

  @Get('employee-payroll-variance')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getEmployeeVariance(@CurrentUser() user: User) {
    return this.reportService.getEmployeePayrollVariance(user.companyId);
  }

  @Get('company-payroll')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getPayrollSummary(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    return this.reportService.getPayrollDashboard(user.companyId, month);
  }

  @Get('payroll-preview')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getCombinedPayroll(@CurrentUser() user: User) {
    return this.reportService.getCombinedPayroll(user.companyId);
  }

  @Get('analytics-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getPayrollAnalyticsReport(
    @CurrentUser() user: User,
    @Query('month') month?: string,
  ) {
    return this.reportService.getPayrollAnalyticsReport(user.companyId, month);
  }

  /** Cost broken down by pay group for a given month */
  @Get('payroll-cost') //
  @SetMetadata('permission', ['payroll.reports.read'])
  @UseGuards(JwtAuthGuard)
  async getCostByPayGroup(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    return this.reportService.getPayrollCostReport(user.companyId, month);
  }

  /** Top N employees by bonus amount for a given month */
  @Get('top-bonus-recipients')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getTopBonusRecipients(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('limit') limit = 10,
  ) {
    return this.reportService.getTopBonusRecipients(
      user.companyId,
      month,
      Number(limit),
    );
  }

  // variance report
  @Get('company-variance-report')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getVarianceReport(@CurrentUser() user: User) {
    return this.generateReportService.getPayrollVarianceMatrices(
      user.companyId,
    );
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getLoanSummaryReport(@CurrentUser() user: User) {
    return await this.reportService.getLoanFullReport(user.companyId);
  }

  @Get('repayment')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getLoanRepaymentReport(@CurrentUser() user: User) {
    return await this.reportService.getLoanRepaymentReport(user.companyId);
  }

  // Deductions ---------------------
  @Get('deductions-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async getDeductionsSummary(
    @CurrentUser() user: User,
    @Query('month') month?: string,
  ) {
    return this.reportService.getDeductionsSummary(user.companyId, month);
  }

  // DOWNLOADS
  @Get('payment-advice/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadPaymentAdvice(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('format') format: 'internal' | 'bank' = 'internal',
  ) {
    const url = await this.generateReportService.downloadPayslipsToS3(
      user.companyId,
      id,
      format,
    );
    return { url };
  }

  @Get('gen-gl-summary-from-payroll')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async generateGLSummary(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    const url =
      await this.generateReportService.generateGLSummaryFromPayrollToS3(
        user.companyId,
        month,
      );
    return { url };
  }

  @Get('gen-company-ytd')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadYTD(
    @CurrentUser() user: User,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const url = await this.generateReportService.downloadYtdPayslipsToS3(
      user.companyId,
      format,
    );
    return { url };
  }

  @Get('gen-company-variance')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('roles', ['super_admin', 'admin'])
  async downloadCompanyVariance(@CurrentUser() user: User) {
    const url =
      await this.generateReportService.generateCompanyPayrollVarianceReportToS3(
        user.companyId,
      );
    return { url };
  }

  @Get('gen-employee-variance')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadEmployeeVariance(@CurrentUser() user: User) {
    const url =
      await this.generateReportService.generateEmployeeMatrixVarianceReportToS3(
        user.companyId,
      );
    return { url };
  }

  /** Full payroll dashboard report CSV → S3 */
  @Get('gen-payroll-dashboard')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadPayrollDashboard(@CurrentUser() user: User) {
    const url =
      await this.generateReportService.generatePayrollDashboardReportToS3(
        user.companyId,
      );
    return { url };
  }

  /** Payroll run summaries report CSV → S3 (optionally pass ?month=YYYY-MM) */
  @Get('gen-run-summaries')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadRunSummaries(
    @CurrentUser() user: User,
    @Query('month') month?: string,
  ) {
    const url = await this.generateReportService.generateRunSummariesReportToS3(
      user.companyId,
      month,
    );
    return { url };
  }

  // Generate Report by Employee Deductions

  @Get('gen-employee-deductions')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadEmployeeDeductions(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const url =
      await this.generateReportService.generateDeductionsByEmployeeReportToS3(
        user.companyId,
        month,
        format,
      );
    return { url };
  }

  /** Cost by pay-group report CSV → S3 (requires ?month=YYYY-MM) */
  @Get('gen-cost-by-paygroup')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadCostByPayGroup(
    @CurrentUser() user: User,
    @Query('month') month: string,
  ) {
    const url =
      await this.generateReportService.generateCostByPayGroupReportToS3(
        user.companyId,
        month,
      );
    return { url };
  }

  /** Cost by department report CSV → S3 (requires ?month=YYYY-MM) */
  @Get('gen-cost-by-department')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadCostByDepartment(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const url =
      await this.generateReportService.generateCostByDepartmentReportToS3(
        user.companyId,
        month,
        format,
      );
    return { url };
  }

  /** Top bonus recipients report CSV → S3 (requires ?month=YYYY-MM, optional ?limit) */
  @Get('gen-top-bonus-recipients')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadTopBonusRecipients(
    @CurrentUser() user: User,
    @Query('month') month: string,
    @Query('limit') limit?: string,
  ) {
    const url =
      await this.generateReportService.generateTopBonusRecipientsReportToS3(
        user.companyId,
        month,
        limit ? Number(limit) : undefined,
      );
    return { url };
  }

  // load summary report
  @Get('gen-loan-summary')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadLoanSummaryReport(@CurrentUser() user: User) {
    const url = await this.generateReportService.generateLoanSummaryReportToS3(
      user.companyId,
    );
    return { url };
  }

  // loan repayment report
  @Get('gen-loan-repayment')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permission', ['payroll.reports.read'])
  async downloadLoanRepaymentReport(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    const url =
      await this.generateReportService.generateLoanRepaymentReportToS3(
        user.companyId,
        format,
        month,
      );
    return { url };
  }
}
