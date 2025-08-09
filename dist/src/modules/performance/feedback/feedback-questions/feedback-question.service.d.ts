import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
import { CacheService } from 'src/common/cache/cache.service';
import { PinoLogger } from 'nestjs-pino';
export declare class FeedbackQuestionService {
    private readonly db;
    private readonly cache;
    private readonly logger;
    constructor(db: db, cache: CacheService, logger: PinoLogger);
    private listKey;
    private typeKey;
    private oneKey;
    private burst;
    create(dto: CreateFeedbackQuestionDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string;
        type: string;
        order: number | null;
        question: string;
        inputType: string | null;
    }>;
    findAll(companyId: string): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }[]>;
    findByType(companyId: string, type: string): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }[]>;
    findOne(companyId: string, id: string): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    update(companyId: string, id: string, dto: UpdateFeedbackQuestionDto): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    delete(companyId: string, id: string): Promise<{
        message: string;
    }>;
    reorderQuestionsByType(companyId: string, type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager', newOrder: {
        id: string;
        order: number;
    }[]): Promise<{
        message: string;
    }>;
    seedFeedbackQuestions(companyId: string): Promise<{
        message: string;
    }>;
}
