import { S3StorageService } from 'src/common/aws/s3-storage.service';
import { ReportService } from './report.service';
import { db } from 'src/drizzle/types/drizzle';
export declare class GenerateReportService {
    private db;
    private readonly payrollService;
    private readonly awsService;
    constructor(db: db, payrollService: ReportService, awsService: S3StorageService);
    private format;
    private formatNumber;
    private todayString;
    private exportAndUpload;
    private exportAndUploadExcel;
    private exportAndUploadMatrix;
    downloadPayslipsToS3(companyId: string, payrollRunId: string, format: 'internal' | 'bank' | 'nhf' | 'pension' | 'paye' | 'payment_schedule' | 'daily_schedule'): Promise<{
        url: string;
        record: any;
    } | null>;
    downloadYtdPayslipsToS3(companyId: string, format?: 'csv' | 'excel'): Promise<{
        url: string;
        record: any;
    }>;
    private generateCompanyVarianceMatrix;
    private generateEmployeeVarianceMatrix;
    getPayrollVarianceMatrices(companyId: string): Promise<{
        company: {
            rows: never[];
            columns: never[];
            payrollDate: null;
            previousPayrollDate: null;
            empty: boolean;
        } | {
            payrollDate: string;
            previousPayrollDate: string;
            rows: {
                [x: string]: string;
                metric: string;
                variance: string;
            }[];
            columns: {
                field: string;
                title: string;
            }[];
            empty?: undefined;
        };
        employees: {
            rows: never[];
            columns: never[];
            payrollDate: null;
            previousPayrollDate: null;
            empty: boolean;
        } | {
            payrollDate: string;
            previousPayrollDate: string;
            rows: any[];
            columns: {
                field: string;
                title: string;
            }[];
            empty?: undefined;
        };
    }>;
    generateCompanyPayrollVarianceReportToS3(companyId: string): Promise<{
        url: string;
        record: any;
    }>;
    generateEmployeeMatrixVarianceReportToS3(companyId: string): Promise<{
        url: string;
        record: any;
    }>;
    generatePayrollDashboardReportToS3(companyId: string): Promise<{
        url: string;
        record: any;
    }>;
    generateRunSummariesReportToS3(companyId: string, month?: string): Promise<{
        url: string;
        record: any;
    }>;
    generateCostByPayGroupReportToS3(companyId: string, month: string): Promise<{
        url: string;
        record: any;
    }>;
    generateCostByDepartmentReportToS3(companyId: string, month: string, format?: 'csv' | 'excel'): Promise<{
        url: string;
        record: any;
    }>;
    generateDeductionsByEmployeeReportToS3(companyId: string, month: string, format?: 'csv' | 'excel'): Promise<{
        url: string;
        record: any;
    }>;
    generateTopBonusRecipientsReportToS3(companyId: string, month: string, limit?: number): Promise<{
        url: string;
        record: any;
    }>;
    generateLoanSummaryReportToS3(companyId: string): Promise<{
        url: string;
        record: any;
    }>;
    generateLoanRepaymentReportToS3(companyId: string, format?: 'csv' | 'excel', month?: string): Promise<{
        url: string;
        record: any;
    }>;
    generateGLSummaryFromPayroll(companyId: string, month: string): Promise<{
        rows: never[];
        columns: never[];
        empty: boolean;
    } | {
        rows: {
            glAccountCode: string;
            yearMonth: string;
            label: string;
            debit: string;
            credit: string;
        }[];
        columns: {
            field: string;
            title: string;
        }[];
        empty?: undefined;
    }>;
    generateGLSummaryFromPayrollToS3(companyId: string, month: string): Promise<{
        url: string;
        record: any;
    }>;
}
