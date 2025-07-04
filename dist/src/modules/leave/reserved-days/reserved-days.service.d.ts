import { CreateReservedDayDto } from './dto/create-reserved-day.dto';
import { UpdateReservedDayDto } from './dto/update-reserved-day.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class ReservedDaysService {
    private db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(dto: CreateReservedDayDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string | null;
        startDate: string;
        employeeId: string | null;
        endDate: string;
        createdBy: string;
        leaveTypeId: string;
        reason: string | null;
    }>;
    getReservedDates(companyId: string, employeeId: string): Promise<string[]>;
    findAll(companyId: string): Promise<({
        id: string;
        startDate: string;
        endDate: string;
        createdAt: Date | null;
        employeeName: string;
        leaveType: string;
        createdBy: string;
        reason: string | null;
    } | {
        id: string;
        startDate: string;
        endDate: string;
        createdAt: Date | null;
        employeeName: string;
        leaveType: string;
        createdBy: string;
        reason: string | null;
    })[]>;
    findByEmployee(employeeId: string): Promise<{
        id: string;
        employeeId: string | null;
        companyId: string | null;
        leaveTypeId: string;
        createdBy: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        createdAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        employeeId: string | null;
        companyId: string | null;
        leaveTypeId: string;
        createdBy: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        createdAt: Date | null;
    }>;
    update(id: string, dto: UpdateReservedDayDto, user: User): Promise<{
        id: string;
        employeeId: string | null;
        companyId: string | null;
        leaveTypeId: string;
        createdBy: string;
        startDate: string;
        endDate: string;
        reason: string | null;
        createdAt: Date | null;
    }[]>;
    remove(id: string): Promise<any>;
}
