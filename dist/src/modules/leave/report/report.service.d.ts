import { db } from 'src/drizzle/types/drizzle';
import { SearchLeaveReportsDto } from './dto/search-leave-report.dto';
import { HolidaysService } from '../holidays/holidays.service';
import { LeaveRequestService } from '../request/leave-request.service';
import { LeaveBalanceService } from '../balance/leave-balance.service';
import { S3StorageService } from 'src/common/aws/s3-storage.service';
interface LeaveBalanceReportFilter {
    leaveTypeName?: string;
    year?: number;
}
export declare class LeaveReportService {
    private readonly db;
    private readonly holidaysService;
    private readonly leaveRequestService;
    private readonly leaveBalanceService;
    private readonly awsService;
    constructor(db: db, holidaysService: HolidaysService, leaveRequestService: LeaveRequestService, leaveBalanceService: LeaveBalanceService, awsService: S3StorageService);
    leaveManagement(company_id: string, countryCode: string): Promise<{
        holidays: {
            name: string;
            date: string;
            type: string;
        }[];
        leaveRequests: ({
            employeeId: string;
            requestId: string;
            employeeName: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            status: string;
            reason: string | null;
            department: any;
            jobRole: string | null;
            totalDays: string;
        } | {
            employeeId: string;
            requestId: string;
            employeeName: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            status: string;
            reason: string | null;
            department: any;
            jobRole: string | null;
            totalDays: string;
        } | {
            employeeId: string;
            requestId: string;
            employeeName: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            status: string;
            reason: string | null;
            department: any;
            jobRole: string | null;
            totalDays: string;
        } | {
            employeeId: string;
            requestId: string;
            employeeName: string;
            leaveType: string;
            startDate: string;
            endDate: string;
            status: string;
            reason: string | null;
            department: any;
            jobRole: string | null;
            totalDays: string;
        })[];
        leaveBalances: ({
            employeeId: string;
            companyId: any;
            name: string;
            department: any;
            jobRole: string | null;
            totalBalance: string;
        } | {
            employeeId: string;
            companyId: any;
            name: string;
            department: any;
            jobRole: string | null;
            totalBalance: string;
        } | {
            employeeId: string;
            companyId: any;
            name: string;
            department: any;
            jobRole: string | null;
            totalBalance: string;
        } | {
            employeeId: string;
            companyId: any;
            name: string;
            department: any;
            jobRole: string | null;
            totalBalance: string;
        })[];
    }>;
    listEmployeeLeaveBalances(companyId: string): Promise<({
        employeeId: string;
        leaveTypeId: string;
        leaveTypeName: string;
        entitlement: string;
        used: string;
        balance: string;
        year: number;
        employeeName: string;
    } | {
        employeeId: string;
        leaveTypeId: string;
        leaveTypeName: string;
        entitlement: string;
        used: string;
        balance: string;
        year: number;
        employeeName: string;
    })[]>;
    listLeaveRequests(companyId: string, status?: 'pending' | 'approved' | 'rejected'): Promise<({
        requestId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: string;
        endDate: string;
        totalDays: string;
        status: string;
        requestedAt: Date | null;
        rejectionReason: string | null;
        employeeName: string;
    } | {
        requestId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: string;
        endDate: string;
        totalDays: string;
        status: string;
        requestedAt: Date | null;
        rejectionReason: string | null;
        employeeName: string;
    })[]>;
    departmentLeaveSummary(companyId: string): Promise<({
        departmentName: any;
        totalLeaveDays: number;
    } | {
        departmentName: any;
        totalLeaveDays: number;
    })[]>;
    pendingApprovalRequests(companyId: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        leaveTypeId: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        status: string;
        totalDays: string;
        approverId: string | null;
        approvedAt: Date | null;
        requestedAt: Date | null;
        rejectionReason: string | null;
        approvalChain: unknown;
        currentApprovalIndex: number | null;
        approvalHistory: unknown;
        partialDay: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    searchLeaveReports(companyId: string, dto: SearchLeaveReportsDto): Promise<{
        leaveType: string;
        totalLeaveDays: number;
    }[]>;
    generateLeaveBalanceReport(companyId: string): Promise<{
        leaveBalances: ({
            employeeId: string;
            leaveTypeId: string;
            leaveTypeName: string;
            entitlement: string;
            used: string;
            balance: string;
            year: number;
            employeeName: string;
        } | {
            employeeId: string;
            leaveTypeId: string;
            leaveTypeName: string;
            entitlement: string;
            used: string;
            balance: string;
            year: number;
            employeeName: string;
        })[];
    }>;
    generateLeaveUtilizationReport(companyId: string, dto: SearchLeaveReportsDto): Promise<{
        leaveUtilization: {
            leaveType: string;
            totalLeaveDays: number;
        }[];
        departmentUsage: ({
            departmentName: any;
            totalLeaveDays: number;
        } | {
            departmentName: any;
            totalLeaveDays: number;
        })[];
    }>;
    generateLeaveBalanceReportToS3(companyId: string, filters?: LeaveBalanceReportFilter): Promise<{
        url: string;
        record: any;
    }>;
}
export {};
