import { db } from 'src/drizzle/types/drizzle';
import { CreateLeaveDto, CreateLeaveRequestDto, UpdateLeaveDto, UpdateLeaveRequestDto } from '../dto/leave.dto';
import { AttendanceService } from './attendance.service';
import { PusherService } from 'src/notification/services/pusher.service';
import { PushNotificationService } from 'src/notification/services/push-notification.service';
export declare class LeaveService {
    private db;
    private readonly attendance;
    private readonly pusher;
    private readonly pushNotification;
    constructor(db: db, attendance: AttendanceService, pusher: PusherService, pushNotification: PushNotificationService);
    leaveManagement(company_id: string, countryCode: string): Promise<{
        leaveSummary: {
            leave_type: string;
            leave_entitlement: number;
            used: number;
        }[];
        holidays: {
            name: string;
            date: string;
            type: string | null;
        }[];
        leaveRequests: {
            id: string;
            leave_type: string;
            start_date: string;
            end_date: string;
            leave_status: string | null;
            total_days_off: number | null;
            employee_id: string;
            employee_name: string | null;
            employee_last_name: string | null;
            approved_by: string | null;
        }[];
    }>;
    createLeave(company_id: string, dto: CreateLeaveDto): Promise<string>;
    getLeaves(company_id: string): Promise<{
        id: string;
        leave_type: string;
        leave_entitlement: number;
        company_id: string;
    }[]>;
    getLeaveSummary(company_id: string): Promise<{
        leave_type: string;
        leave_entitlement: number;
        used: number;
    }[]>;
    getLeaveById(id: string): Promise<{
        id: string;
        leave_type: string;
        leave_entitlement: number;
        company_id: string;
    }[]>;
    updateLeave(id: string, dto: UpdateLeaveDto): Promise<string>;
    deleteLeave(id: string): Promise<string>;
    createLeaveRequest(employee_id: string, dto: CreateLeaveRequestDto): Promise<string>;
    getAllCompanyLeaveRequests(company_id: string): Promise<{
        id: string;
        leave_type: string;
        start_date: string;
        end_date: string;
        leave_status: string | null;
        total_days_off: number | null;
        employee_id: string;
        employee_name: string | null;
        employee_last_name: string | null;
        approved_by: string | null;
    }[]>;
    getEmployeeRequests(employee_id: string): Promise<{
        id: string;
        leave_type: string;
        start_date: string;
        end_date: string;
        leave_status: string | null;
        total_days_off: number | null;
        notes: string | null;
        employee_id: string;
        approved_by: string | null;
    }[]>;
    getLeaveRequestById(id: string): Promise<{
        id: string;
        leave_type: string;
        start_date: string;
        end_date: string;
        leave_status: string | null;
        total_days_off: number | null;
        notes: string | null;
        employee_id: string;
        approved_by: string | null;
    }>;
    updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto): Promise<string>;
    approveLeaveRequest(id: string, user_id: string): Promise<string>;
    rejectLeaveRequest(id: string, user_id: string): Promise<string>;
    getLeaveBalance(employee_id: string): Promise<{
        leave_type: string;
        leave_entitlement: number;
        used: number;
        remaining: number;
        total: number;
    }[]>;
}
