import { db } from 'src/drizzle/types/drizzle';
import { CreateOfferTemplateDto } from './dto/create-offer-template.dto';
import { UpdateOfferTemplateDto } from './dto/update-offer-template.dto';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class OfferLetterService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private sysListKey;
    private companyListKey;
    private companyNamesKey;
    private combinedKey;
    private tmplDetailKey;
    private burst;
    seedSystemOfferLetterTemplates(): Promise<void>;
    cloneCompanyTemplate(user: User, templateId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        content: string;
        isDefault: boolean | null;
        isSystemTemplate: boolean | null;
        clonedFromTemplateId: string | null;
    }>;
    createCompanyTemplate(user: User, dto: CreateOfferTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        content: string;
        isDefault: boolean | null;
        isSystemTemplate: boolean | null;
        clonedFromTemplateId: string | null;
    }>;
    getCompanyTemplates(companyId: string): Promise<{
        companyTemplates: {
            id: string;
            companyId: string | null;
            name: string;
            content: string;
            isDefault: boolean | null;
            isSystemTemplate: boolean | null;
            createdAt: Date | null;
            clonedFromTemplateId: string | null;
        }[];
        systemTemplates: {
            id: string;
            companyId: string | null;
            name: string;
            content: string;
            isDefault: boolean | null;
            isSystemTemplate: boolean | null;
            createdAt: Date | null;
            clonedFromTemplateId: string | null;
        }[];
    }>;
    getCompanyOfferTemplates(companyId: string): Promise<{
        id: string;
        name: string;
    }[]>;
    getTemplateById(templateId: string, companyId: string): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        content: string;
        isDefault: boolean | null;
        isSystemTemplate: boolean | null;
        createdAt: Date | null;
        clonedFromTemplateId: string | null;
    }>;
    updateTemplate(templateId: string, user: User, dto: UpdateOfferTemplateDto): Promise<{
        id: string;
        companyId: string | null;
        name: string;
        content: string;
        isDefault: boolean | null;
        isSystemTemplate: boolean | null;
        createdAt: Date | null;
        clonedFromTemplateId: string | null;
    }>;
    deleteTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
}
