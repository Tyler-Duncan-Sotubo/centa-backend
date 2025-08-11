import { db } from 'src/drizzle/types/drizzle';
import { CreateQuestionsDto } from './dto/create-questions.dto';
import { UpdateQuestionsDto } from './dto/update-questions.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class PerformanceReviewQuestionService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private oneKey;
    private burst;
    private ensureCompanyOwned;
    create(user: User, dto: CreateQuestionsDto): Promise<{
        id: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        type: string;
        isGlobal: boolean | null;
        question: string;
        competencyId: string | null;
        isMandatory: boolean | null;
        allowNotes: boolean | null;
    }>;
    update(id: string, user: User, dto: UpdateQuestionsDto): Promise<{
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
    delete(id: string, user: User): Promise<{
        message: string;
    }>;
    seedGlobalReviewQuestions(): Promise<{
        message: string;
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
}
