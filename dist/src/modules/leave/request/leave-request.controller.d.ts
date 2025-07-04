import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequestService } from './leave-request.service';
export declare class LeaveRequestController extends BaseController {
    private readonly leaveRequest;
    constructor(leaveRequest: LeaveRequestService);
    createLeaveRequest(dto: CreateLeaveRequestDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        startDate: string;
        employeeId: string;
        status: string;
        rejectionReason: string | null;
        endDate: string;
        requestedAt: Date | null;
        reason: string | null;
        approvedAt: Date | null;
        leaveTypeId: string;
        totalDays: string;
        approverId: string | null;
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
