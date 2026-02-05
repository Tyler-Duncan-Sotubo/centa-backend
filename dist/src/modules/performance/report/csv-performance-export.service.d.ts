import { ReportService } from './report.service';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { User } from 'src/common/types/user.type';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
export declare class PerformanceExportService {
    private readonly reportService;
    private readonly s3Service;
    constructor(reportService: ReportService, s3Service: S3StorageService);
    exportTopEmployeesToS3(user: User, filters: GetTopEmployeesDto): Promise<{
        url: string;
        record: any;
    }>;
    exportGoalReportToCSV(user: User, filters: GetGoalReportDto): Promise<{
        url: string;
        record: any;
    }>;
    exportFeedbackReportToCSV(user: User, filters: GetFeedbackReportDto): Promise<{
        url: string;
        record: any;
    }>;
    exportAssessmentSummaryToCSV(user: User, filters: GetAssessmentReportDto): Promise<{
        url: string;
        record: any;
    }>;
}
