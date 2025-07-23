import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class PipelineSeederService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    seedEngineeringPipeline(): Promise<void>;
    seedSalesPipeline(): Promise<void>;
    seedDefaultPipeline(): Promise<void>;
    seedAllTemplates(): Promise<void>;
    private seedTemplate;
    cloneTemplateForCompany(templateId: string, user: User, templateName?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    cloneTemplateToJob(templateId: string, jobId: string): Promise<{
        message: string;
        stageCount: any;
    }>;
}
