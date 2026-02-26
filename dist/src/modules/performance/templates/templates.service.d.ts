import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PerformanceTemplatesService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, auditService: AuditService, cache: CacheService);
    private ns;
    private tags;
    private bump;
    create(user: User, dto: CreateTemplateDto): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        companyId: string;
        description: string | null;
        isDefault: boolean | null;
        includeGoals: boolean | null;
        includeAttendance: boolean | null;
        includeFeedback: boolean | null;
        includeQuestionnaire: boolean | null;
        requireSignature: boolean | null;
        restrictVisibility: boolean | null;
    }>;
    findAll(companyId: string): Promise<{
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
    findOne(id: string, companyId: string): Promise<{
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
    private getById;
    update(id: string, updateTemplateDto: UpdateTemplateDto, user: User): Promise<{
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
    remove(id: string, user: User): Promise<{
        success: boolean;
    }>;
    assignQuestions(templateId: string, questionIds: string[], user: User): Promise<{
        success: boolean;
        count: number;
    }>;
    removeQuestion(templateId: string, questionId: string, user: User): Promise<{
        success: boolean;
    }>;
    seedDefaultTemplate(companyId: string): Promise<void>;
    lookupQuestionIds: (dbConn: db, questions: string[], companyId?: string) => Promise<string[]>;
}
