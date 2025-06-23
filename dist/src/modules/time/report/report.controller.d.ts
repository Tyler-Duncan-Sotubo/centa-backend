import { ReportService } from './report.service';
import { User } from 'src/common/types/user.type';
import { GenerateReportsService } from './generate-reports.service';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class ReportController extends BaseController {
    private readonly reportService;
    private readonly generateReportsService;
    constructor(reportService: ReportService, generateReportsService: GenerateReportsService);
    getCombinedAttendanceReport(user: User, startDate: string, endDate: string, yearMonth: string): Promise<{
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
    getAttendanceSummary(user: User): Promise<{
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
    getMonthlyAttendanceSummary(user: User, yearMonth: string): Promise<{
        employeeId: string;
        name: string;
        present: number;
        late: number;
        absent: number;
        onLeave: number;
        holidays: number;
        penalties: number;
    }[]>;
    getShiftDashboardSummaryByMonth(user: User, yearMonth: string, locationId?: string, departmentId?: string): Promise<{
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
    getLateArrivalsReport(user: User, yearMonth: string): Promise<({
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
    getAbsenteeismReport(user: User, startDate: string, endDate: string): Promise<{
        employeeId: string;
        name: string;
        date: string;
    }[]>;
    getOvertimeReport(user: User, yearMonth: string): Promise<{
        employeeId: string;
        clockIn: Date;
        overtimeMinutes: number | null;
    }[]>;
    getDepartmentReport(user: User, yearMonth: string): Promise<Record<string, {
        present: number;
        absent: number;
        total: number;
    }>>;
    downloadDailyAttendanceSummary(user: User): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadMonthlyAttendanceSummary(user: User, yearMonth: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadLateArrivalsReport(user: User, yearMonth: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    generateDepartmentReport(user: User, yearMonth: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadAbsenteeismReport(user: User, startDate: string, endDate: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
    downloadOvertimeReport(user: User, yearMonth: string): Promise<{
        url: {
            url: string;
            record: any;
        };
    }>;
}
