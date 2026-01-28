import { AuditService } from 'src/modules/audit/audit.service';
import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateLeaveTypeDto } from './dto/create-leave-type.dto';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';
import { CacheService } from 'src/common/cache/cache.service';
export declare class LeaveTypesService {
    private readonly auditService;
    private readonly db;
    private readonly cache;
    constructor(auditService: AuditService, db: db, cache: CacheService);
    private tags;
    bulkCreateLeaveTypes(companyId: string, rows: any[]): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
    }[]>;
    create(dto: CreateLeaveTypeDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    findOne(companyId: string, leaveTypeId: string): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    update(leaveTypeId: string, dto: UpdateLeaveTypeDto, user: User, ip: string): Promise<{
        id: string;
        name: string;
        isPaid: boolean | null;
        colorTag: string | null;
        companyId: string;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    remove(user: User, leaveTypeId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
