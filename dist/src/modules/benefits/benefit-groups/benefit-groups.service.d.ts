import { CreateBenefitGroupDto } from './dto/create-benefit-group.dto';
import { UpdateBenefitGroupDto } from './dto/update-benefit-group.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';
export declare class BenefitGroupsService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private tags;
    create(dto: CreateBenefitGroupDto, user: User): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        companyId: string;
        description: string | null;
        rules: unknown;
        teamId: string | null;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        companyId: string;
        teamId: string | null;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }[]>;
    findOne(companyId: string, id: string): Promise<{
        id: string;
        companyId: string;
        teamId: string | null;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }>;
    update(id: string, dto: UpdateBenefitGroupDto, user: User): Promise<{
        id: string;
        companyId: string;
        teamId: string | null;
        name: string;
        description: string | null;
        rules: unknown;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<void>;
}
