import { PerformanceTemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PerformanceTemplatesController extends BaseController {
    private readonly templatesService;
    constructor(templatesService: PerformanceTemplatesService);
    create(createTemplateDto: CreateTemplateDto, user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date | null;
        companyId: string;
        isDefault: boolean | null;
        includeGoals: boolean | null;
        includeAttendance: boolean | null;
        includeFeedback: boolean | null;
        includeQuestionnaire: boolean | null;
        requireSignature: boolean | null;
        restrictVisibility: boolean | null;
    }>;
    findAll(user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        description: string | null;
        isDefault: boolean | null;
        includeGoals: boolean | null;
        includeAttendance: boolean | null;
        includeFeedback: boolean | null;
        includeQuestionnaire: boolean | null;
        requireSignature: boolean | null;
        restrictVisibility: boolean | null;
        createdAt: Date | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        questions: {
            id: string;
            question: string;
            type: string;
            isMandatory: boolean | null;
            order: number | null;
            competencyId: string | null;
            competencyName: string | null;
        }[];
        id: string;
        companyId: string;
        name: string;
        description: string | null;
        isDefault: boolean | null;
        includeGoals: boolean | null;
        includeAttendance: boolean | null;
        includeFeedback: boolean | null;
        includeQuestionnaire: boolean | null;
        requireSignature: boolean | null;
        restrictVisibility: boolean | null;
        createdAt: Date | null;
    }>;
    update(templateId: string, updateTemplateDto: UpdateTemplateDto, user: User): Promise<{
        id: string;
        companyId: string;
        name: string;
        description: string | null;
        isDefault: boolean | null;
        includeGoals: boolean | null;
        includeAttendance: boolean | null;
        includeFeedback: boolean | null;
        includeQuestionnaire: boolean | null;
        requireSignature: boolean | null;
        restrictVisibility: boolean | null;
        createdAt: Date | null;
    }>;
    remove(templateId: string, user: User): Promise<{
        success: boolean;
    }>;
    assignQuestions(templateId: string, questionIds: string[], user: User): Promise<{
        success: boolean;
        count: number;
    }>;
    removeQuestion(templateId: string, questionId: string, user: User): Promise<{
        success: boolean;
    }>;
}
