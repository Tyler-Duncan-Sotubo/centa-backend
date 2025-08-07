import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';
export declare class ScorecardTemplateService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    getAllTemplates(companyId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isSystem: boolean | null;
        createdAt: Date | null;
        criteria: unknown;
    }[]>;
    create(user: User, dto: CreateScorecardTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        description: string | null;
        isSystem: boolean | null;
    }>;
    cloneTemplate(templateId: string, user: User): Promise<{
        id: string;
        name: string;
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
