import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { EmployeeShiftsService } from './employee-shifts.service';
import { CreateEmployeeShiftDto } from './dto/create-employee-shift.dto';
import { BulkCreateEmployeeShiftDto } from './dto/bulk-assign-employee-shifts.dto';
export declare class EmployeeShiftsController extends BaseController {
    private readonly employeeShiftsService;
    constructor(employeeShiftsService: EmployeeShiftsService);
    create(employeeId: string, dto: CreateEmployeeShiftDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        isDeleted: boolean | null;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
    }>;
    update(assignmentId: string, dto: CreateEmployeeShiftDto, user: User, ip: string): Promise<{
        _calendarVersion: string;
        id: string;
        companyId: string;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
        isDeleted: boolean | null;
        createdAt: Date | null;
    }>;
    getCalendarEvents(user: User, start: string, end: string): Promise<Record<string, {
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
    }[]>>;
    bulkCreate(dto: BulkCreateEmployeeShiftDto[], user: User, ip: string): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        isDeleted: boolean | null;
        employeeId: string;
        shiftId: string | null;
        shiftDate: string;
    }[]>;
    listAllPaginated(user: User, companyId: string, page?: number, limit?: number, search?: string, shiftId?: string): Promise<{
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
    getAll(user: User): Promise<({
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
    getShiftAssignment(assignmentId: string, user: User): Promise<{
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
    getEmployeeShifts(employeeId: string, user: User): Promise<({
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
    getShiftEmployees(shiftId: string, user: User): Promise<({
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
    bulkRemove(employeeIds: string[], user: User, ip: string): Promise<{
        success: boolean;
        removedCount: number;
    }>;
    removeOne(assignmentId: string, user: User, ip: string): Promise<{
        success: boolean;
    }>;
}
