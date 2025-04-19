import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeLocationDto, CreateOfficeLocationDto, UpdateEmployeeLocationDto, UpdateOfficeLocationDto } from '../dto/locations.dto';
import { AttendanceRulesDTO, WorkHoursDTO } from '../dto/update-attendance-settings.dto';
export declare class AttendanceService {
    private configService;
    private db;
    constructor(configService: ConfigService, db: db);
    private getCompanyByUserId;
    private getEmployeeByUserId;
    private isSaturday;
    private isSunday;
    private getWeekendsForYear;
    private getPublicHolidaysForYear;
    private removeDuplicateDates;
    private getNonWorkingDaysForYear;
    insertHolidaysForCurrentYear(countryCode: string): Promise<void>;
    getUpcomingPublicHolidays(countryCode: string): Promise<{
        name: string;
        date: string;
        type: string | null;
    }[]>;
    getWorkHoursSettings(company_id: string): Promise<{
        id: string;
        startTime: string;
        endTime: string;
        breakMinutes: number | null;
        workDays: string[] | null;
        createdAt: Date | null;
        company_id: string;
    }>;
    getAttendanceRules(company_id: string): Promise<{
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
    updateWorkHoursSettings(company_id: string, dto: WorkHoursDTO): Promise<string>;
    updateAttendanceRules(company_id: string, dto: AttendanceRulesDTO): Promise<string>;
    createOfficeLocation(company_id: string, dto: CreateOfficeLocationDto): Promise<{
        id: string;
    }[]>;
    getOfficeLocations(company_id: string): Promise<{
        id: string;
        company_id: string;
        location_name: string;
        latitude: string;
        longitude: string;
        address: string | null;
    }[]>;
    getOfficeLocationById(id: string): Promise<{
        id: string;
        company_id: string;
        location_name: string;
        latitude: string;
        longitude: string;
        address: string | null;
    }>;
    updateOfficeLocation(id: string, dto: UpdateOfficeLocationDto): Promise<string>;
    deleteOfficeLocation(id: string): Promise<string>;
    createEmployeeLocation(dto: CreateEmployeeLocationDto): Promise<string>;
    getAllEmployeeLocationsByCompanyId(company_id: string): Promise<{
        id: string;
        location_name: string;
        address: string | null;
        longitude: string;
        latitude: string;
        first_name: string;
        last_name: string;
    }[]>;
    updateEmployeeLocation(id: string, dto: UpdateEmployeeLocationDto): Promise<string>;
    deleteEmployeeLocation(id: string): Promise<string>;
    checkLocation(employee_id: string, latitude: string, longitude: string): Promise<void>;
    clockIn(employee_id: string, latitude: string, longitude: string): Promise<string>;
    clockOut(employee_id: string, latitude: string, longitude: string): Promise<string>;
    getDailyAttendanceSummary(companyId: string): Promise<{
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
    saveDailyAttendanceSummary(companyId: string): Promise<void>;
    getAttendanceSummaryByDate(date: string, companyId: string): Promise<{
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
    getEmployeeAttendanceByDate(employeeId: string, date: string): Promise<{
        date: string;
        check_in_time: string | null;
        check_out_time: string | null;
        status: "absent" | "present" | "late";
    }>;
    getEmployeeAttendanceByMonth(employeeId: string, month: string): Promise<{
        summaryList: {
            date: string;
            check_in_time: string | null;
            check_out_time: string | null;
            status: "absent" | "present" | "late";
        }[];
    }>;
    getMonthlyAttendanceSummary(companyId: string, yearMonth: string): Promise<{
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
    private getDatesBetween;
}
