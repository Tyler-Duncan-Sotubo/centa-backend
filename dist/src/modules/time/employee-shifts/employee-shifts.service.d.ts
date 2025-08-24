import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { User } from 'src/common/types/user.type';
import { UpdateEmployeeShiftDto } from './dto/update-employee-shift.dto';
import { CacheService } from 'src/common/cache/cache.service';
type CalendarEvent = {
    date: string;
    startTime: string;
    endTime: string;
    employeeId: string;
    shiftId: string;
    employeeName: string;
    locationId: string;
    jobTitle: string;
    id: string;
    shiftName: string;
};
export declare class EmployeeShiftsService {
    private readonly auditService;
    private readonly db;
    private readonly cache;
    constructor(auditService: AuditService, db: db, cache: CacheService);
    private tags;
    private assertNoOverlap;
    assignShift(employeeId: string, dto: CreateEmployeeShiftDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        isDeleted: boolean | null;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
    }>;
    updateShift(employeeShiftId: string, dto: UpdateEmployeeShiftDto, user: User, ip: string): Promise<{
        id: string;
        companyId: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        isDeleted: boolean | null;
        createdAt: Date | null;
    }>;
    bulkAssignMany(companyId: string, dtos: Array<{
        employeeId: string;
        shiftId: string;
        shiftDate: string;
    }>, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        isDeleted: boolean | null;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
    }[]>;
    removeAssignment(assignmentId: string, user: User, ip: string): Promise<{
        success: boolean;
    }>;
    bulkRemoveAssignments(employeeIds: string[], user: User, ip: string): Promise<{
        success: boolean;
        removedCount: number;
    }>;
    private baseEmployeeShiftQuery;
    listAll(companyId: string): Promise<({
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    } | {
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    })[]>;
    listAllPaginated(companyId: string, { page, limit, search, shiftId, }: {
        page?: number;
        limit?: number;
        search?: string;
        shiftId?: string;
    }): Promise<{
        data: ({
            id: string;
            employeeId: string;
            shiftId: string | null;
            shiftDate: string;
            employeeName: string;
        } | {
            id: string;
            employeeId: string;
            shiftId: string | null;
            shiftDate: string;
            employeeName: string;
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getOne(companyId: string, assignmentId: string): Promise<{
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    } | {
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    }>;
    listByEmployee(companyId: string, employeeId: string): Promise<({
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    } | {
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    })[]>;
    getActiveShiftForEmployee(employeeId: string, companyId: string, date: string): Promise<{
        id: string;
        companyId: string;
        locationId: string | null;
        name: string;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
        notes: string | null;
        isDeleted: boolean | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null>;
    getEmployeeShiftsForRange(employeeId: string, companyId: string, start: Date, end: Date): Promise<{
        date: string;
        startTime: string;
        endTime: string;
        lateToleranceMinutes: number | null;
    }[]>;
    listByShift(companyId: string, shiftId: string): Promise<({
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    } | {
        id: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        employeeName: string;
    })[]>;
    getCalendarEvents(companyId: string, from: string, to: string): Promise<Record<string, CalendarEvent[]>>;
}
export {};
