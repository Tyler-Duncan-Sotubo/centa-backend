import { CreateClockInOutDto } from './dto/create-clock-in-out.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { AttendanceSettingsService } from '../settings/attendance-settings.service';
import { EmployeeShiftsService } from '../employee-shifts/employee-shifts.service';
import { User } from 'src/common/types/user.type';
import { ReportService } from '../report/report.service';
import { AdjustAttendanceDto } from './dto/adjust-attendance.dto';
import { CacheService } from 'src/common/cache/cache.service';
type DayStatus = 'absent' | 'present' | 'late';
export declare class ClockInOutService {
    private readonly db;
    private readonly auditService;
    private readonly employeesService;
    private readonly attendanceSettingsService;
    private readonly employeeShiftsService;
    private readonly reportService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, employeesService: EmployeesService, attendanceSettingsService: AttendanceSettingsService, employeeShiftsService: EmployeeShiftsService, reportService: ReportService, cache: CacheService);
    private tags;
    private pickTz;
    private isWithinRadius;
    private getTodayWindow;
    private settingsMemo;
    private getSettings;
    checkLocation(latitude: string, longitude: string, employee: any): Promise<void>;
    clockIn(user: User, dto: CreateClockInOutDto): Promise<string>;
    clockOut(user: User, latitude: string, longitude: string, tz?: string): Promise<string>;
    getAttendanceStatus(employeeId: string, companyId: string, tz?: string): Promise<{
        status: "absent";
        checkInTime?: undefined;
        checkOutTime?: undefined;
    } | {
        status: "present";
        checkInTime: Date;
        checkOutTime: Date | null;
    }>;
    getDailyDashboardStats(companyId: string): Promise<{
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
    getDailyDashboardStatsByDate(companyId: string, date: string): Promise<{
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
    getMonthlyDashboardStats(companyId: string, yearMonth: string): Promise<{
        month: string;
        totalEmployees: number;
        attendanceRate: string;
        avgLatePerEmployee: number;
        avgAbsentPerEmployee: number;
    }>;
    getEmployeeAttendanceByDate(employeeId: string, companyId: string, date: string): Promise<{
        date: string;
        checkInTime: string | null;
        checkOutTime: string | null;
        status: DayStatus;
        workDurationMinutes: number | null;
        overtimeMinutes: number;
        isLateArrival: boolean;
        isEarlyDeparture: boolean;
    }>;
    getEmployeeAttendanceByMonth(employeeId: string, companyId: string, yearMonth: string): Promise<{
        summaryList: Array<{
            date: string;
            checkInTime: string | null;
            checkOutTime: string | null;
            status: DayStatus;
        }>;
    }>;
    adjustAttendanceRecord(dto: AdjustAttendanceDto, attendanceRecordId: string, user: User, ip: string): Promise<string>;
}
export {};
