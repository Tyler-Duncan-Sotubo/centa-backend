import { ReportService } from './report.service';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { GetAppraisalReportDto } from './dto/get-appraisal-report.dto';
import { User } from 'src/common/types/user.type';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { AwsService } from 'src/common/aws/aws.service';
export declare class PerformancePdfExportService {
    private readonly reportService;
    private readonly awsService;
    constructor(reportService: ReportService, awsService: AwsService);
    date: Date;
    formattedDate: string;
    exportAppraisalReportToPDF(user: User, filters?: GetAppraisalReportDto): Promise<string>;
    exportTopEmployeesToPDF(user: User, filters: GetTopEmployeesDto): Promise<string>;
    exportCompetencyHeatmapToPDF(user: User, cycleId: string): Promise<string>;
    exportGoalReportToPDF(user: User, filters: GetGoalReportDto): Promise<string>;
    exportFeedbackReportToPDF(user: User, filters: GetFeedbackReportDto): Promise<string>;
    exportAssessmentSummaryToPDF(user: User, filters: GetAssessmentReportDto): Promise<string>;
}
