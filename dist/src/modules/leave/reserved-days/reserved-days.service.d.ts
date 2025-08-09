import { CreateReservedDayDto } from './dto/create-reserved-day.dto';
import { UpdateReservedDayDto } from './dto/update-reserved-day.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ReservedDaysService {
    private db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private oneKey;
    private listKey;
    private byEmployeeKey;
    private datesKey;
    private burst;
    private overlaps;
    create(dto: CreateReservedDayDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string | null;
        createdBy: string;
        startDate: string;
        employeeId: string | null;
        endDate: string;
        reason: string | null;
        leaveTypeId: string;
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
        employeeId: string | null;
    } | {
        id: string;
        startDate: string;
        endDate: string;
        createdAt: Date | null;
        employeeName: string;
        leaveType: string;
        createdBy: string;
        reason: string | null;
        employeeId: string | null;
    })[]>;
    findByEmployee(companyId: string, employeeId: string): Promise<{
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
    findOne(id: string, user: User): Promise<{
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
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
