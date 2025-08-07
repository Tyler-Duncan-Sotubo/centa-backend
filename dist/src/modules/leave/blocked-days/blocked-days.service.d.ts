import { CreateBlockedDayDto } from './dto/create-blocked-day.dto';
import { UpdateBlockedDayDto } from './dto/update-blocked-day.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class BlockedDaysService {
    private db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(dto: CreateBlockedDayDto, user: User): Promise<{
        date: string;
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        reason: string | null;
        createdBy: string;
    }[]>;
    getBlockedDates(companyId: string): Promise<string[]>;
    findAll(companyId: string): Promise<{
        id: string;
        date: string;
        reason: string | null;
        createdAt: Date | null;
        createdBy: string;
        name: string;
    }[]>;
    findOne(id: string): Promise<{
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
    }[]>;
    remove(id: string): Promise<any>;
}
