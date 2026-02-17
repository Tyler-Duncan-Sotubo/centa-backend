import { db } from 'src/drizzle/types/drizzle';
import { EmployeeShiftsService } from '../employee-shifts/employee-shifts.service';
import { AttendanceSettingsService } from '../settings/attendance-settings.service';
import { EmployeesService } from 'src/modules/core/employees/employees.service';
import { LeaveRequestService } from 'src/modules/leave/request/leave-request.service';
import { DepartmentService } from 'src/modules/core/department/department.service';
export declare class ReportService {
    private readonly db;
    private readonly attendanceSettingsService;
    private readonly employeeShiftsService;
    private readonly employeesService;
    private readonly leaveRequestService;
    private readonly departmentsService;
    constructor(db: db, attendanceSettingsService: AttendanceSettingsService, employeeShiftsService: EmployeeShiftsService, employeesService: EmployeesService, leaveRequestService: LeaveRequestService, departmentsService: DepartmentService);
    getDailyAttendanceSummary(companyId: string): Promise<{
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
            department: any;
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
        dashboard: {
            sevenDayTrend: number[];
            wtdAttendanceRate: string;
            overtimeThisMonth: string;
            topLateArrivals: string[];
            departmentRates: {
                department: string;
                rate: string;
            }[];
            rolling30DayAbsenteeismRate: string;
        };
    }>;
    getDailySummaryList(companyId: string, date: string): Promise<{
        employeeId: any;
        employeeNumber: any;
        name: string;
        department: any;
        checkInTime: string | null;
        checkOutTime: string | null;
        status: "absent" | "present" | "late" | "weekend";
        totalWorkedMinutes: number | null;
    }[]>;
    getMonthlyAttendanceSummary(companyId: string, yearMonth: string): Promise<{
        employeeId: string;
        name: string;
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        holidays: number;
        penalties: number;
    }[]>;
    getLast6MonthsAttendanceSummary(companyId: string): Promise<{
        month: string;
        present: number;
        absent: number;
        late: number;
    }[]>;
    getLateArrivalsReport(companyId: string, yearMonth: string): Promise<({
        employeeId: string;
        employeeNumber: any;
        name: unknown;
        clockIn: Date;
    } | {
        employeeId: string;
        employeeNumber: any;
        name: unknown;
        clockIn: Date;
    })[]>;
    getOvertimeReport(companyId: string, yearMonth: string): Promise<{
        employeeId: string;
        clockIn: Date;
        overtimeMinutes: number | null;
    }[]>;
    getAbsenteeismReport(companyId: string, startDate: string, endDate: string): Promise<{
        employeeId: string;
        name: string;
        date: string;
    }[]>;
    getDepartmentAttendanceSummary(companyId: string, yearMonth: string): Promise<Record<string, {
        present: number;
        absent: number;
        total: number;
    }>>;
    getCombinedAttendanceReports(companyId: string, yearMonth?: string, startDate?: string, endDate?: string): Promise<{
        dailySummary: {
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
                department: any;
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
            dashboard: {
                sevenDayTrend: number[];
                wtdAttendanceRate: string;
                overtimeThisMonth: string;
                topLateArrivals: string[];
                departmentRates: {
                    department: string;
                    rate: string;
                }[];
                rolling30DayAbsenteeismRate: string;
            };
        };
        monthlySummary: {
            employeeId: string;
            name: string;
            present: number;
            late: number;
            absent: number;
            onLeave: number;
            holidays: number;
            penalties: number;
        }[];
        lateArrivals: ({
            employeeId: string;
            employeeNumber: any;
            name: unknown;
            clockIn: Date;
        } | {
            employeeId: string;
            employeeNumber: any;
            name: unknown;
            clockIn: Date;
        })[];
        overtime: {
            employeeId: string;
            clockIn: Date;
            overtimeMinutes: number | null;
        }[];
        absenteeism: {
            employeeId: string;
            name: string;
            date: string;
        }[];
        departmentSummary: Record<string, {
            present: number;
            absent: number;
            total: number;
        }>;
    }>;
    getShiftDashboardSummaryByMonth(companyId: string, yearMonth: string, filters?: {
        locationId?: string;
        departmentId?: string;
    }): Promise<{
        yearMonth: string;
        filters: {
            locationId?: string;
            departmentId?: string;
        } | undefined;
        monthlySummary: {
            yearMonth: string;
            totalShifts: number;
            uniqueEmployees: number;
            uniqueShiftTypes: number;
        } | {
            yearMonth: string;
            totalShifts: number;
            uniqueEmployees: number;
            uniqueShiftTypes: number;
        };
        detailedBreakdown: ({
            yearMonth: string;
            daysExpected: number;
            employeeId: string;
            employeeName: string;
            shiftName: string | null;
            locationName: string | null;
            startTime: string | null;
            endTime: string | null;
            daysScheduled: number;
            daysPresent: number;
        } | {
            yearMonth: string;
            daysExpected: number;
            employeeId: string;
            employeeName: string;
            shiftName: string | null;
            locationName: string | null;
            startTime: string | null;
            endTime: string | null;
            daysScheduled: number;
            daysPresent: number;
        })[];
    }>;
}
