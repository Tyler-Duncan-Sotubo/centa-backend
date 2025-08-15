import { db } from 'src/drizzle/types/drizzle';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { UpdateQuestionsDto } from './dto/update-questions.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class PerformanceReviewQuestionService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(user: User, dto: CreateQuestionsDto): Promise<{
        id: string;
        isActive: boolean | null;
        createdAt: Date | null;
        companyId: string | null;
        type: string;
        isGlobal: boolean | null;
        competencyId: string | null;
        question: string;
        isMandatory: boolean | null;
        allowNotes: boolean | null;
    }>;
    getAll(companyId: string): Promise<{
        id: string;
        companyId: string | null;
        competencyId: string | null;
        question: string;
        type: string;
        isMandatory: boolean | null;
        allowNotes: boolean | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
    }[]>;
    getById(id: string, companyId: string): Promise<{
        id: string;
        companyId: string | null;
        competencyId: string | null;
        question: string;
        type: string;
        isMandatory: boolean | null;
        allowNotes: boolean | null;
        isActive: boolean | null;
        isGlobal: boolean | null;
        createdAt: Date | null;
    }>;
    update(id: string, user: User, dto: UpdateQuestionsDto): Promise<{
        message: string;
    }>;
    delete(id: string, user: User): Promise<{
        message: string;
    }>;
    seedGlobalReviewQuestions(): Promise<{
        message: string;
    }>;
}
