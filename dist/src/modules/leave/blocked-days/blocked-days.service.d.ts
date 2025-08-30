import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';
export declare class BlockedDaysService {
    private db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private tags;
    create(dto: CreateBlockedDayDto, user: User): Promise<{
        name: string;
        date: string;
        id: string;
        createdAt: Date | null;
        companyId: string | null;
        createdBy: string;
        reason: string | null;
    }>;
    getBlockedDates(companyId: string): Promise<string[]>;
    findAll(companyId: string): Promise<{
        id: string;
        date: string;
        reason: string | null;
        createdAt: Date | null;
        createdBy: string;
        name: string;
    }[]>;
    findOne(id: string, companyId: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        reason: string | null;
        createdBy: string;
        createdAt: Date | null;
    }>;
    update(id: string, dto: UpdateBlockedDayDto, user: User): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        date: string;
        reason: string | null;
        createdBy: string;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
