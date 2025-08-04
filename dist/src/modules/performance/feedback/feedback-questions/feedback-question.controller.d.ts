import { FeedbackQuestionService } from './feedback-question.service';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackQuestionDto } from '../dto/create-feedback-question.dto';
import { UpdateFeedbackQuestionDto } from '../dto/update-feedback-question.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class FeedbackQuestionsController extends BaseController {
    private readonly questionService;
    constructor(questionService: FeedbackQuestionService);
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
    remove(id: string): Promise<{
        message: string;
    }>;
    reorder(type: string, payload: {
        questions: {
            id: string;
            order: number;
        }[];
    }): Promise<{
        message: string;
    }>;
}
