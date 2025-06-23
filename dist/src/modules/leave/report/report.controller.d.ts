import { LeaveReportService } from './report.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { SearchLeaveReportsDto } from './dto/search-leave-report.dto';
export declare class ReportController extends BaseController {
    private readonly reportService;
    constructor(reportService: LeaveReportService);
    getLeaveManagement(user: User): Promise<{
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
    getLeaveBalances(user: User): Promise<any>;
    getLeaveRequests(user: User, ip: string, status?: 'pending' | 'approved' | 'rejected'): Promise<any>;
    getPendingLeaveRequests(user: User): Promise<any>;
    getLeaveBalanceReport(user: User): Promise<{
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
    getLeaveUtilizationReport(user: User, dto: SearchLeaveReportsDto): Promise<{
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
    generateLeaveBalanceReportToS3(user: User, leaveTypeName?: string, year?: number): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
}
