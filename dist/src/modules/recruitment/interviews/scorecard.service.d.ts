import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ScorecardTemplateService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private detailKey;
    private burst;
    getAllTemplates(companyId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isSystem: boolean | null;
        createdAt: Date | null;
        criteria: unknown;
    }[]>;
    getTemplateWithCriteria(templateId: string, companyId?: string): Promise<{
        criteria: {
            id: string;
            label: string;
            description: string | null;
            maxScore: number;
            order: number;
        }[];
        id: string;
        isSystem: boolean | null;
        companyId: string | null;
        name: string;
        description: string | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    create(user: User, dto: CreateScorecardTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        isSystem: boolean | null;
        description: string | null;
    }>;
    cloneTemplate(templateId: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        isSystem: boolean | null;
        description: string | null;
    }>;
    seedSystemTemplates(): Promise<{
        success: boolean;
    }>;
    deleteTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
}
