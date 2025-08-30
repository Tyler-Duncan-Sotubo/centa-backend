import { db } from 'src/drizzle/types/drizzle';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PipelineService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private tags;
    createTemplate(user: User, dto: CreatePipelineDto): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        companyId: string | null;
        description: string | null;
        isGlobal: boolean | null;
    }>;
    findAllTemplates(companyId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
        stageCount: number;
    }[]>;
    findTemplateWithStages(templateId: string): Promise<{
        stages: {
            id: string;
            name: string;
            order: number;
            createdAt: Date | null;
        }[];
        id: string;
        isGlobal: boolean | null;
        companyId: string | null;
        name: string;
        description: string | null;
        createdAt: Date | null;
    }>;
    updateTemplate(templateId: string, user: User, dto: UpdatePipelineDto): Promise<{
        message: string;
    }>;
    deleteTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
    getJobPipeline(jobId: string): Promise<{
        id: string;
        jobId: string;
        name: string;
        order: number;
        createdAt: Date | null;
    }[]>;
    addStageToJob(jobId: string, stageName: string, order?: number): Promise<{
        name: string;
        id: string;
        createdAt: Date | null;
        order: number;
        jobId: string;
    }>;
    reorderJobPipeline(jobId: string, stageIds: string[]): Promise<{
        message: string;
    }>;
}
