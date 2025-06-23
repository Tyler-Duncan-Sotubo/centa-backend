import { ReportService } from './report.service';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
export declare class GenerateReportsService {
    private readonly reportService;
    private readonly awsService;
    constructor(reportService: ReportService, awsService: S3StorageService);
    generateDailyAttendanceSummaryToS3(companyId: string): Promise<{
        url: string;
        record: any;
    }>;
    generateMonthlyAttendanceSummaryToS3(companyId: string, yearMonth: string): Promise<{
        url: string;
        record: any;
    }>;
    generateLateArrivalsReportToS3(companyId: string, yearMonth: string): Promise<{
        url: string;
        record: any;
    }>;
    generateOvertimeReportToS3(companyId: string, yearMonth: string): Promise<{
        url: string;
        record: any;
    }>;
    generateAbsenteeismReportToS3(companyId: string, startDate: string, endDate: string): Promise<{
        url: string;
        record: any;
    }>;
    generateDepartmentAttendanceReport(companyId: string, yearMonth: string): Promise<{
        url: string;
        record: any;
    }>;
}
