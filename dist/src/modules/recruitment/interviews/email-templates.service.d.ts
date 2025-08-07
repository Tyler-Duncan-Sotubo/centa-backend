import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateEmailTemplateDto } from './dto/email-template.dto';
export declare class InterviewEmailTemplateService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    getAllTemplates(companyId: string): Promise<{
        id: string;
        name: string;
        subject: string;
        body: string;
        isGlobal: boolean | null;
        companyId: string | null;
        createdBy: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    create(user: User, dto: CreateEmailTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string | null;
        body: string;
        createdBy: string | null;
        isGlobal: boolean | null;
        subject: string;
    }>;
    cloneTemplate(templateId: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string | null;
        body: string;
        createdBy: string | null;
        isGlobal: boolean | null;
        subject: string;
    }>;
    deleteTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
    seedSystemEmailTemplates(): Promise<{
        success: boolean;
    }>;
}
