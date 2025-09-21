import { ClockInOutService } from './clock-in-out.service';
import { CreateClockInOutDto } from './dto/create-clock-in-out.dto';
import { User } from 'src/common/types/user.type';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class ClockInOutController extends BaseController {
    private readonly clockInOutService;
    constructor(clockInOutService: ClockInOutService);
    clockIn(dto: CreateClockInOutDto, user: User): Promise<string>;
    clockOut(dto: CreateClockInOutDto, user: User): Promise<string>;
    getAttendanceStatus(user: User, employeeId: string): Promise<{
        status: "absent";
        checkInTime?: undefined;
        checkOutTime?: undefined;
    } | {
        status: "present";
        checkInTime: Date;
        checkOutTime: Date | null;
    }>;
    getDailyDashboardStatsByDate(user: User, date: string): Promise<{
        summaryList: {
            employeeId: any;
            employeeNumber: any;
            name: string;
            department: string;
            checkInTime: string | null;
            checkOutTime: string | null;
            status: "absent" | "present" | "late";
            totalWorkedMinutes: number | null;
        }[];
    }>;
    getDailyDashboardStats(user: User): Promise<{
        sevenDayTrend: number[];
        wtdAttendanceRate: string;
        overtimeThisMonth: string;
        topLateArrivals: string[];
        departmentRates: {
            department: string;
            rate: string;
        }[];
        rolling30DayAbsenteeismRate: string;
        details: {
            date: string;
            totalEmployees: number;
            present: number;
            late: number;
            absent: number;
            attendanceRate: string;
            averageCheckInTime: Date | null;
        };
        summaryList: {
            employeeId: any;
            employeeNumber: any;
            name: string;
            department: string;
            checkInTime: string | null;
            checkOutTime: string | null;
            status: "absent" | "present" | "late";
            totalWorkedMinutes: number | null;
        }[];
        metrics: {
            attendanceChangePercent: number;
            lateChangePercent: number;
            averageCheckInTimeChange: {
                today: Date | null;
                yesterday: Date | null;
            };
        };
    }>;
    monthlyStats(yearMonth: string, user: User): Promise<{
        month: string;
        totalEmployees: number;
        attendanceRate: string;
        avgLatePerEmployee: number;
        avgAbsentPerEmployee: number;
    }>;
    getEmployeeAttendance(employeeId: string, yearMonth: string, user: User): Promise<{
        date: string;
        checkInTime: string | null;
        checkOutTime: string | null;
        status: "absent" | "present" | "late";
        workDurationMinutes: number | null;
        overtimeMinutes: number;
        isLateArrival: boolean;
        isEarlyDeparture: boolean;
    }>;
    getEmployeeAttendanceByMonth(employeeId: string, yearMonth: string, user: User): Promise<{
        summaryList: Array<{
            date: string;
            checkInTime: string | null;
            checkOutTime: string | null;
            status: "absent" | "present" | "late";
        }>;
    }>;
    adjustAttendance(attendanceRecordId: string, dto: AdjustAttendanceDto, user: User, ip: string): Promise<string>;
}
