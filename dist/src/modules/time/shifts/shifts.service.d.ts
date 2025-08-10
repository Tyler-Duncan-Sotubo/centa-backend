import { AuditService } from 'src/modules/audit/audit.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';
import { PinoLogger } from 'nestjs-pino';
export declare class ShiftsService {
    private readonly auditService;
    private readonly db;
    private readonly cache;
    private readonly logger;
    constructor(auditService: AuditService, db: db, cache: CacheService, logger: PinoLogger);
    private listKey;
    private oneKey;
    private invalidateAfterChange;
    private readonly VALID_DAYS;
    private parseTime;
    private normalizeDays;
    private validateTimes;
    private ensureUniqueName;
    private ensureLocationBelongs;
    bulkCreate(companyId: string, rows: any[]): Promise<{
        insertedCount: number;
        inserted: {
            id: string;
            name: string;
            startTime: string;
            endTime: string;
        }[];
        errors: {
            rowName: string;
            error: string;
        }[];
    }>;
    create(dto: CreateShiftDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
        locationId: string | null;
        isDeleted: boolean | null;
        notes: string | null;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
    }>;
    findAll(companyId: string, opts?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        workingDays: unknown;
        lateToleranceMinutes: number | null;
        allowEarlyClockIn: boolean | null;
        earlyClockInMinutes: number | null;
        allowLateClockOut: boolean | null;
        lateClockOutMinutes: number | null;
        locationName: string | null;
        locationId: string | null;
    }[]>;
    findOne(id: string, companyId: string): Promise<{
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
    }>;
    update(id: string, dto: UpdateShiftDto, user: User, ip: string): Promise<{
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
    }>;
    remove(id: string, user: User): Promise<{
        success: boolean;
    }>;
}
