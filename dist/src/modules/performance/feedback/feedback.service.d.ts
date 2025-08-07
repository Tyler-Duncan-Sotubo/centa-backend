import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class FeedbackService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    create(dto: CreateFeedbackDto, user: User): Promise<{
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
    private resolveViewerIds;
    getFeedbackForRecipient(recipientId: string, viewer: User): Promise<any[]>;
    getFeedbackBySender(senderId: string): Promise<{
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
    getResponsesForFeedback(feedbackIds: string[]): Promise<{
        feedbackId: string;
        questionId: string;
    }[]>;
    findAll(companyId: string, filters?: {
        type?: string;
        departmentId?: string;
    }): Promise<{
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
    findAllByEmployeeId(companyId: string, employeeId: string, filters?: {
        type?: string;
    }): Promise<{
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
    findOne(id: string, user: User): Promise<"You do not have permission to view this feedback" | {
        responses: {
            answer: string;
            questionText: string | null;
            inputType: string | null;
        }[];
        id: string;
        type: string;
        createdAt: Date | null;
        isAnonymous: boolean | null;
        employeeName: string;
        senderName: string;
    }>;
    update(id: string, updateFeedbackDto: UpdateFeedbackDto, user: User): Promise<any>;
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
