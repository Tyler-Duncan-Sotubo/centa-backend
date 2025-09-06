import { PipelineService } from './pipeline.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { PipelineSeederService } from './pipeline-seeder.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
export declare class PipelineController extends BaseController {
    private readonly pipelineService;
    private readonly pipelineSeedService;
    constructor(pipelineService: PipelineService, pipelineSeedService: PipelineSeederService);
    cloneTemplateForCompany(templateId: string, templateName: string, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date | null;
        companyId: string | null;
        isGlobal: boolean | null;
    }>;
    createTemplate(createPipelineDto: CreatePipelineDto, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date | null;
        companyId: string | null;
        isGlobal: boolean | null;
    }>;
    findAllTemplates(user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
        stageCount: number;
    }[]>;
    findOne(id: string): Promise<{
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
    update(id: string, updatePipelineDto: UpdatePipelineDto, user: User): Promise<{
        message: string;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
}
