import { Injectable } from '@nestjs/common';
import { ReportService } from './report.service';
import { ExportUtil } from 'src/utils/export.util';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { GetAppraisalReportDto } from './dto/get-appraisal-report.dto';
import { User } from 'src/common/types/user.type';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';

@Injectable()
export class PerformanceExportService {
  constructor(
    private readonly reportService: ReportService,
    private readonly s3Service: S3StorageService,
  ) {}

  async exportAppraisalReportToS3(user: User, filters?: GetAppraisalReportDto) {
    const report = await this.reportService.getAppraisalReport(user, filters);

    const exportData = report.map((r) => ({
      employeeName: r.employeeName,
      department: r.departmentName,
      jobRole: r.jobRoleName,
      score: r.appraisalScore ?? 'N/A',
      recommendation: r.promotionRecommendation ?? 'N/A',
      summary: r.appraisalNote?.replace(/<\/?[^>]+(>|$)/g, '') ?? '',
    }));

    const filename = `appraisal_report_${user.companyId}.csv`;

    const path = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'employeeName', title: 'Employee Name' },
        { field: 'department', title: 'Department' },
        { field: 'jobRole', title: 'Job Role' },
        { field: 'score', title: 'Score' },
        { field: 'recommendation', title: 'Recommendation' },
        { field: 'summary', title: 'Summary' },
      ],
      filename,
    );

    return this.s3Service.uploadFilePath(
      path,
      user.companyId,
      'performance',
      'appraisal',
    );
  }

  async exportTopEmployeesToS3(user: User, filters: GetTopEmployeesDto) {
    const result = await this.reportService.getTopEmployees(user, filters);

    const exportData = result.map((r) => ({
      name: r.employeeName,
      department: r.departmentName,
      jobRole: r.jobRoleName,
      finalScore: r.finalScore,
      promotionRecommendation: r.promotionRecommendation ?? 'N/A',
    }));

    const filename = `top_employees_${user.companyId}_${filters.cycleType}`;

    const path = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'name', title: 'Employee Name' },
        { field: 'department', title: 'Department' },
        { field: 'jobRole', title: 'Job Role' },
        { field: 'finalScore', title: 'Score' },
        { field: 'promotionRecommendation', title: 'Recommendation' },
      ],
      filename,
    );

    return this.s3Service.uploadFilePath(
      path,
      user.companyId,
      'performance',
      'top',
    );
  }

  async exportCompetencyHeatmapToS3(user: User, cycleId: string) {
    const heatmap = await this.reportService.getCompetencyHeatmap(user, {
      cycleId,
    });

    // Flatten for export
    const exportData = Object.entries(heatmap).flatMap(([competency, levels]) =>
      Object.entries(levels).map(([level, count]) => ({
        competency,
        level,
        count,
      })),
    );

    const filename = `competency_heatmap_${user.companyId}_${cycleId}`;

    const path = await ExportUtil.exportToCSV(
      exportData,
      [
        { field: 'competency', title: 'Competency' },
        { field: 'level', title: 'Level' },
        { field: 'count', title: 'Count' },
      ],
      filename,
    );

    return this.s3Service.uploadFilePath(
      path,
      user.companyId,
      'performance',
      'heatmap',
    );
  }

  async exportGoalReportToCSV(user: User, filters: GetGoalReportDto) {
    const report = await this.reportService.getGoalReport(user, filters);

    const csvData = report.map((goal) => ({
      goalId: goal.goalId,
      employeeId: goal.employeeId,
      employeeName: goal.employeeName,
      department: goal.departmentName,
      jobRole: goal.jobRoleName,
      title: goal.title,
      description: goal.description,
      type: goal.type,
      status: goal.status,
      weight: goal.weight,
      startDate: goal.startDate,
      dueDate: goal.dueDate,
    }));

    const filePath = await ExportUtil.exportToCSV(
      csvData,
      [
        { field: 'goalId', title: 'Goal ID' },
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'employeeName', title: 'Employee Name' },
        { field: 'department', title: 'Department' },
        { field: 'jobRole', title: 'Job Role' },
        { field: 'title', title: 'Goal Title' },
        { field: 'description', title: 'Description' },
        { field: 'type', title: 'Type' },
        { field: 'status', title: 'Status' },
        { field: 'weight', title: 'Weight' },
        { field: 'startDate', title: 'Start Date' },
        { field: 'dueDate', title: 'Due Date' },
      ],
      `goal_report`,
    );

    return this.s3Service.uploadFilePath(
      filePath,
      user.companyId,
      'reports',
      'goals',
    );
  }

  async exportFeedbackReportToCSV(user: User, filters: GetFeedbackReportDto) {
    const report = await this.reportService.getFeedbackReport(user, filters);

    const csvData = report.flatMap((item) =>
      item.responses.map((r) => ({
        employeeId: item.recipientId,
        employeeName: item.employeeName,
        isAnonymous: item.isAnonymous ? 'Yes' : 'No',
        submittedAt: item.submittedAt,
        questionText: r.questionText,
        answer: r.answer,
      })),
    );

    const filePath = await ExportUtil.exportToCSV(
      csvData,
      [
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'employeeName', title: 'Employee Name' },
        { field: 'submittedAt', title: 'Submitted At' },
        { field: 'isAnonymous', title: 'Anonymous?' },
        { field: 'questionText', title: 'Question Text' },
        { field: 'answer', title: 'Answer' },
      ],
      `feedback_report_${filters.type}`,
    );

    return this.s3Service.uploadFilePath(
      filePath,
      user.companyId,
      'reports',
      'feedback',
    );
  }

  async exportAssessmentSummaryToCSV(
    user: User,
    filters: GetAssessmentReportDto,
  ) {
    const report = await this.reportService.getAssessmentReportSummary(
      user,
      filters,
    );

    const csvData = report.map((entry) => ({
      assessmentId: entry.id,
      employeeId: entry.employeeId,
      employeeName: entry.revieweeName,
      reviewerName: entry.reviewerName,
      department: entry.departmentName,
      type: entry.type,
      status: entry.status,
      submittedAt: entry.submittedAt,
      score: entry.finalScore,
      recommendation: entry.promotionRecommendation,
      potential: entry.potentialFlag ? 'Yes' : 'No',
    }));

    const filePath = await ExportUtil.exportToCSV(
      csvData,
      [
        { field: 'assessmentId', title: 'Assessment ID' },
        { field: 'employeeId', title: 'Employee ID' },
        { field: 'employeeName', title: 'Employee Name' },
        { field: 'reviewerName', title: 'Reviewer Name' },
        { field: 'department', title: 'Department' },
        { field: 'type', title: 'Assessment Type' },
        { field: 'status', title: 'Status' },
        { field: 'submittedAt', title: 'Submitted At' },
        { field: 'score', title: 'Final Score' },
        { field: 'recommendation', title: 'Recommendation' },
        { field: 'potential', title: 'High Potential' },
      ],
      `assessment_summary`,
    );

    return this.s3Service.uploadFilePath(
      filePath,
      user.companyId,
      'reports',
      'assessments',
    );
  }

  // Add more exporters here as needed
}
