import { FeedbackQuestionService } from './feedback-question.service';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class FeedbackQuestionsController extends BaseController {
    private readonly questionService;
    constructor(questionService: FeedbackQuestionService);
    seedFeedbackQuestions(user: User): Promise<void>;
    create(dto: CreateFeedbackQuestionDto, user: User): Promise<{
        id: string;
        isActive: boolean | null;
        createdAt: Date | null;
        companyId: string;
        type: string;
        order: number | null;
        question: string;
        inputType: string | null;
    }>;
    findAll(user: User): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }[]>;
    findByType(type: string, user: User): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    update(id: string, dto: UpdateFeedbackQuestionDto, user: User): Promise<{
        id: string;
        companyId: string;
        type: string;
        question: string;
        inputType: string | null;
        order: number | null;
        isActive: boolean | null;
        createdAt: Date | null;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
    reorder(type: string, payload: {
        questions: {
            id: string;
            order: number;
        }[];
    }, user: User): Promise<{
        message: string;
    }>;
}
