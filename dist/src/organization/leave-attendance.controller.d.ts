import { BaseController } from 'src/config/base.controller';
import { AttendanceService } from './services/attendance.service';
import { CreateEmployeeLocationDto, CreateOfficeLocationDto } from './dto/locations.dto';
import { User } from 'src/types/user.type';
import { LeaveService } from './services/leave.service';
import { CreateLeaveDto, CreateLeaveRequestDto, UpdateLeaveDto, UpdateLeaveRequestDto } from './dto/leave.dto';
import { AttendanceRulesDTO, WorkHoursDTO } from './dto/update-attendance-settings.dto';
export declare class LeaveAttendanceController extends BaseController {
    private readonly attendanceService;
    private readonly leaveService;
    constructor(attendanceService: AttendanceService, leaveService: LeaveService);
    getHolidays(): Promise<void>;
    getUpcomingPublicHolidays(): Promise<{
        name: string;
        date: string;
        type: string | null;
    }[]>;
    createOfficeLocation(dto: CreateOfficeLocationDto, user: User): Promise<{
        id: string;
    }[]>;
    getOfficeLocations(user: User): Promise<{
        id: string;
        company_id: string;
        location_name: string;
        latitude: string;
        longitude: string;
        address: string | null;
    }[]>;
    getOfficeLocationById(location_id: string): Promise<{
        id: string;
        company_id: string;
        location_name: string;
        latitude: string;
        longitude: string;
        address: string | null;
    }>;
    updateOfficeLocation(dto: CreateOfficeLocationDto, location_id: string): Promise<string>;
    deleteOfficeLocation(location_id: string): Promise<string>;
    createEmployeeLocation(dto: CreateEmployeeLocationDto): Promise<string>;
    getEmployeeLocations(user: User): Promise<{
        id: string;
        location_name: string;
        address: string | null;
        longitude: string;
        latitude: string;
        first_name: string;
        last_name: string;
    }[]>;
    updateEmployeeLocation(dto: CreateOfficeLocationDto, location_id: string): Promise<string>;
    deleteEmployeeLocation(location_id: string): Promise<string>;
    getWorkHours(user: User): Promise<{
        id: string;
        startTime: string;
        endTime: string;
        breakMinutes: number | null;
        workDays: string[] | null;
        createdAt: Date | null;
        company_id: string;
    }>;
    getAttendanceRules(user: User): Promise<{
        id: string;
        gracePeriodMins: number | null;
        penaltyAfterMins: number | null;
        penaltyAmount: number | null;
        earlyLeaveThresholdMins: number | null;
        absenceThresholdHours: number | null;
        countWeekends: boolean | null;
        createdAt: Date | null;
        applyToPayroll: boolean | null;
        company_id: string;
    }>;
    updateWorkHours(dto: WorkHoursDTO, user: User): Promise<string>;
    updateAttendanceRules(dto: AttendanceRulesDTO, user: User): Promise<string>;
    getMonthlyAttendanceSummary(user: User, month: string): Promise<{
        employeeId: string;
        firstName: string;
        lastName: string;
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        holidays: number;
        penalties: number;
    }[]>;
    getAttendance(user: User): Promise<{
        details: {
            date: string;
            totalEmployees: number;
            present: number;
            absent: number;
            late: number;
            attendanceRate: string;
            averageCheckInTime: string | null;
        };
        summaryList: {
            employee_id: string;
            name: string;
            department: string;
            check_in_time: string | null;
            check_out_time: string | null;
            status: "absent" | "present" | "late";
        }[];
        metrics: {
            attendanceChangePercent: number;
            lateChangePercent: number;
            absentChange: string;
            averageCheckInTimeChange: {
                today: string | null;
                yesterday: string;
            };
        };
    }[]>;
    getAttendanceByDate(date: string, user: User): Promise<{
        date: string;
        summaryList: {
            employee_id: string;
            name: string;
            department: string;
            check_in_time: string | null;
            check_out_time: string | null;
            status: "absent" | "present" | "late";
        }[];
    }>;
    getEmployeeAttendanceByDate(date: string, employee_id: string): Promise<{
        date: string;
        check_in_time: string | null;
        check_out_time: string | null;
        status: "absent" | "present" | "late";
    }>;
    getEmployeeAttendanceByMonth(date: string, employee_id: string): Promise<{
        summaryList: {
            date: string;
            check_in_time: string | null;
            check_out_time: string | null;
            status: "absent" | "present" | "late";
        }[];
    }>;
    clockIn(employee_id: string, dto: {
        latitude: string;
        longitude: string;
    }): Promise<string>;
    clockOut(employee_id: string, dto: {
        latitude: string;
        longitude: string;
    }): Promise<string>;
    leaveManagement(countryCode: string, user: User): Promise<{
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
    getAllCompanyLeaveRequests(user: User): Promise<{
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
    createLeave(dto: CreateLeaveDto, user: User): Promise<string>;
    getLeaves(user: User): Promise<{
        id: string;
        leave_type: string;
        leave_entitlement: number;
        company_id: string;
    }[]>;
    getLeaveById(leave_id: string): Promise<{
        id: string;
        leave_type: string;
        leave_entitlement: number;
        company_id: string;
    }[]>;
    updateLeave(dto: UpdateLeaveDto, leave_id: string): Promise<string>;
    deleteLeave(leave_id: string): Promise<string>;
    createLeaveRequest(employee_id: string, dto: CreateLeaveRequestDto): Promise<string>;
    getCompanyLeaveRequests(user: User): Promise<{
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
    getLeaveRequests(employee_id: string): Promise<{
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
    getLeaveRequestById(request_id: string): Promise<{
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
    updateLeaveRequest(request_id: string, dto: UpdateLeaveRequestDto): Promise<string>;
    approveLeaveRequest(request_id: string, user: User): Promise<string>;
    rejectLeaveRequest(request_id: string, user: User): Promise<string>;
    getLeaveBalance(employee_id: string): Promise<{
        leave_type: string;
        leave_entitlement: number;
        used: number;
        remaining: number;
        total: number;
    }[]>;
}
