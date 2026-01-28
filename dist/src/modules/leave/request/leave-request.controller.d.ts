import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequestService } from './leave-request.service';
export declare class LeaveRequestController extends BaseController {
    private readonly leaveRequest;
    constructor(leaveRequest: LeaveRequestService);
    createLeaveRequest(dto: CreateLeaveRequestDto, user: User, ip: string): Promise<{
        status: string;
        startDate: string;
        endDate: string;
        totalDays: string;
        reason: string | null;
        rejectionReason: string | null;
        employeeId: string;
        approverId: string | null;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        leaveTypeId: string;
        approvedAt: Date | null;
        requestedAt: Date | null;
        approvalChain: unknown;
        currentApprovalIndex: number | null;
        approvalHistory: unknown;
        partialDay: string | null;
    }>;
    getAllLeaveRequests(user: User): Promise<({
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
    })[]>;
    getLeaveRequestById(leaveRequestId: string, user: User): Promise<{
        requestId: string;
        status: string;
    }>;
    getLeaveRequestByEmployeeId(employeeId: string, user: User): Promise<{
        requestId: string;
        employeeId: string;
        leaveType: string;
        startDate: string;
        endDate: string;
        status: string;
        reason: string | null;
    }[]>;
}
