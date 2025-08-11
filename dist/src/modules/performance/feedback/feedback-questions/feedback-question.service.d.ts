import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
export declare class FeedbackQuestionService {
    private readonly db;
    constructor(db: db);
    create(dto: CreateFeedbackQuestionDto, user: User): Promise<{
        id: string;
        isActive: boolean | null;
        createdAt: Date | null;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
    }>;
    findAll(): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }[]>;
    findByType(type: string): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    update(id: string, dto: UpdateFeedbackQuestionDto): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    delete(id: string): Promise<{
        message: string;
    }>;
    reorderQuestionsByType(type: 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager', newOrder: {
        id: string;
        order: number;
    }[]): Promise<{
        message: string;
    }>;
    seedFeedbackQuestions(companyId: string): Promise<void>;
}
