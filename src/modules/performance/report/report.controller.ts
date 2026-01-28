import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { GetAppraisalReportDto } from './dto/get-appraisal-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { PerformanceExportService } from './csv-performance-export.service';
import { PerformancePdfExportService } from './performance-pdf-export.service';

@Controller('performance-report')
@UseGuards(JwtAuthGuard)
@SetMetadata('permissions', ['performance.settings'])
export class ReportController extends BaseController {
  constructor(
    private readonly reportService: ReportService,
    private readonly csv: PerformanceExportService,
    private readonly pdf: PerformancePdfExportService,
  ) {
    super();
  }

  @Get('overview')
  async getOverview(@CurrentUser() user: User) {
    return this.reportService.getPerformanceOverview(user);
  }

  @Get('reports-filters')
  async getReportsFilters(@CurrentUser() user: User) {
    return this.reportService.reportFilters(user.companyId);
  }

  @Get('appraisal-report')
  async getAppraisalReport(
    @CurrentUser() user: User,
    @Query('cycleId') cycleId: string,
    @Query() filter?: GetAppraisalReportDto,
  ) {
    return this.reportService.getAppraisalReport(user, filter);
  }

  @Get('goal-report')
  async getGoalReport(
    @CurrentUser() user: User,
    @Query() filter?: GetGoalReportDto,
  ) {
    return this.reportService.getGoalReport(user, filter);
  }

  @Get('feedback-report')
  async getFeedbackReport(
    @CurrentUser() user: User,
    @Query() filter: GetFeedbackReportDto,
  ) {
    return this.reportService.getFeedbackReport(user, filter);
  }

  @Get('assessment-report')
  async getAssessmentReport(
    @CurrentUser() user: User,
    @Query() filter?: GetAssessmentReportDto,
  ) {
    return this.reportService.getAssessmentReportSummary(user, filter);
  }

  @Get('top-employees')
  async getTopEmployees(
    @CurrentUser() user: User,
    @Query() filter: GetTopEmployeesDto,
  ) {
    return this.reportService.getTopEmployees(user, filter);
  }

  @Get('competency-heatmap')
  async getCompetencyHeatmap(
    @CurrentUser() user: User,
    @Query() filters: { cycleId: string },
  ) {
    return this.reportService.getCompetencyHeatmap(user, filters);
  }

  // GENERATE REPORTS
  @Get('export-appraisal-report')
  async exportAppraisalReport(
    @CurrentUser() user: User,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query() filters: GetAppraisalReportDto,
  ) {
    const url =
      format === 'pdf'
        ? await this.pdf.exportAppraisalReportToPDF(user, filters)
        : await this.csv.exportAppraisalReportToS3(user, filters);

    return { url };
  }

  @Get('export-top-employees')
  async exportTopEmployees(
    @CurrentUser() user: User,
    @Query() filters: GetTopEmployeesDto,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
  ) {
    const url =
      format === 'pdf'
        ? await this.pdf.exportTopEmployeesToPDF(user, filters)
        : await this.csv.exportTopEmployeesToS3(user, filters);

    return { url };
  }

  @Get('export-competency-heatmap')
  async exportCompetencyHeatmap(
    @CurrentUser() user: User,
    @Query('cycleId') cycleId: string,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
  ) {
    const url =
      format === 'pdf'
        ? await this.pdf.exportCompetencyHeatmapToPDF(user, cycleId)
        : await this.csv.exportCompetencyHeatmapToS3(user, cycleId);

    return { url };
  }

  @Get('export-goal-report')
  async exportGoalReport(
    @CurrentUser() user: User,
    @Query('cycleId') cycleId: string,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query() filters: GetGoalReportDto,
  ) {
    const url =
      format === 'pdf'
        ? await this.pdf.exportGoalReportToPDF(user, filters)
        : await this.csv.exportGoalReportToCSV(user, filters);

    return { url };
  }

  @Get('export-feedback-report')
  async exportFeedbackReport(
    @CurrentUser() user: User,
    @Query() filters: GetFeedbackReportDto,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
  ) {
    const url =
      format === 'pdf'
        ? await this.pdf.exportFeedbackReportToPDF(user, filters)
        : await this.csv.exportFeedbackReportToCSV(user, filters);
    return { url };
  }

  @Get('export-assessment-report')
  async exportAssessmentReport(
    @CurrentUser() user: User,
    @Query('format') format: 'csv' | 'pdf' = 'csv',
    @Query() filters: GetAssessmentReportDto,
  ) {
    const url =
      format === 'pdf'
        ? await this.pdf.exportAssessmentSummaryToPDF(user, filters)
        : await this.csv.exportAssessmentSummaryToCSV(user, filters);
    return { url };
  }
}
