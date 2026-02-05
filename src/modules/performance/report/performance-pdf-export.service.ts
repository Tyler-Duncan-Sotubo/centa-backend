import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { User } from 'src/common/types/user.type';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { AwsService } from 'src/common/aws/aws.service';
import { PdfUtil } from './PdfUtil';

@Injectable()
export class PerformancePdfExportService {
  constructor(
    private readonly reportService: ReportService,
    private readonly awsService: AwsService,
  ) {}

  date = new Date();
  formattedDate = this.date.toISOString().split('T')[0];

  async exportTopEmployeesToPDF(user: User, filters: GetTopEmployeesDto) {
    const result = await this.reportService.getTopEmployees(user, filters);

    const html = PdfUtil.renderTopEmployeesHtml(result);
    const pdfBuffer = await PdfUtil.generatePdf(html);

    const key = `performance/top/top_employees_${filters.cycleType}_${this.formattedDate}.pdf`;
    return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
  }

  async exportGoalReportToPDF(user: User, filters: GetGoalReportDto) {
    const report = await this.reportService.getGoalReport(user, filters);

    const html = PdfUtil.renderGoalReportHtml(report);
    const pdfBuffer = await PdfUtil.generatePdf(html);

    const key = `performance/goals/goal_report_${this.formattedDate}.pdf`;
    return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
  }

  async exportFeedbackReportToPDF(user: User, filters: GetFeedbackReportDto) {
    const report = await this.reportService.getFeedbackReport(user, filters);

    const html = PdfUtil.renderFeedbackReportHtml(report);
    const pdfBuffer = await PdfUtil.generatePdf(html);

    const key = `performance/feedback/feedback_report_${filters.type}_${this.formattedDate}.pdf`;
    return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
  }

  async exportAssessmentSummaryToPDF(
    user: User,
    filters: GetAssessmentReportDto,
  ) {
    const report = await this.reportService.getAssessmentReportSummary(
      user,
      filters,
    );

    const html = PdfUtil.renderAssessmentSummaryHtml(report);
    const pdfBuffer = await PdfUtil.generatePdf(html);

    const key = `performance/assessments/assessment_summary_${this.formattedDate}.pdf`;
    return this.awsService.uploadPdfToS3(user.companyId, key, pdfBuffer);
  }
}
