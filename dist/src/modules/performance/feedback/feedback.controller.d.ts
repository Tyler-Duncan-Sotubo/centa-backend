import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class FeedbackController extends BaseController {
    private readonly feedbackService;
    constructor(feedbackService: FeedbackService);
    create(createFeedbackDto: CreateFeedbackDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        type: string;
        isArchived: boolean | null;
        submittedAt: Date | null;
        senderId: string;
        recipientId: string;
        isAnonymous: boolean | null;
    }>;
    findAll(user: User, type?: string, departmentId?: string): Promise<{
        id: string;
        type: string;
        createdAt: Date | null;
        employeeName: string;
        senderName: string;
        questionsCount: number;
        departmentName: any;
        jobRoleName: string | null;
        departmentId: any;
    }[]>;
    getForEmployee(employeeId: string, user: User, type?: string): Promise<{
        id: string;
        type: string;
        createdAt: Date | null;
        employeeName: string;
        senderName: string;
        questionsCount: number;
        departmentName: any;
        jobRoleName: string | null;
        departmentId: any;
        isArchived: boolean | null;
    }[]>;
    getForRecipient(recipientId: string, user: User): Promise<{
        responses: {
            id: string;
            feedbackId: string;
            question: string;
            answer: string;
            order: number | null;
        }[];
        id: string;
        companyId: string;
        senderId: string;
        recipientId: string;
        type: string;
        isAnonymous: boolean | null;
        submittedAt: Date | null;
        createdAt: Date | null;
        isArchived: boolean | null;
    }[]>;
    findOne(id: string, user: User): Promise<{
        responses: {
            answer: string;
            questionText: string | null;
            inputType: string | null;
        }[];
        id: string;
        type: string;
        createdAt: Date | null;
        isAnonymous: boolean | null;
        recipientId: string;
        employeeName: string;
        senderName: string;
    } | {
        responses: {
            answer: string;
            questionText: string | null;
            inputType: string | null;
        }[];
        id: string;
        type: string;
        createdAt: Date | null;
        isAnonymous: boolean | null;
        recipientId: string;
        employeeName: string;
        senderName: string;
    }>;
    update(id: string, dto: UpdateFeedbackDto, user: User): Promise<{
        id: string;
        companyId: string;
        senderId: string;
        recipientId: string;
        type: string;
        isAnonymous: boolean | null;
        submittedAt: Date | null;
        createdAt: Date | null;
        isArchived: boolean | null;
    }>;
    remove(id: string, user: User): Promise<{
        id: string;
        companyId: string;
        senderId: string;
        recipientId: string;
        type: string;
        isAnonymous: boolean | null;
        submittedAt: Date | null;
        createdAt: Date | null;
        isArchived: boolean | null;
    }>;
}
