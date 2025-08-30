import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ScorecardTemplateService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private tags;
    getAllTemplates(companyId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isSystem: boolean | null;
        createdAt: Date | null;
        criteria: unknown;
    }[]>;
    create(user: User, dto: CreateScorecardTemplateDto): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        description: string | null;
        isSystem: boolean | null;
    }>;
    cloneTemplate(templateId: string, user: User): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        description: string | null;
        isSystem: boolean | null;
    }>;
    seedSystemTemplates(): Promise<{
        success: boolean;
    }>;
    deleteTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
}
