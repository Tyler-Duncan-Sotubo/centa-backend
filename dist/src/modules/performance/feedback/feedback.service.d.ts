import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class FeedbackService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private listKey;
    private empListKey;
    private oneKey;
    private burst;
    private getResponsesForFeedback;
    private resolveViewerIds;
    create(dto: CreateFeedbackDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        senderId: string;
        recipientId: string;
        type: string;
        isAnonymous: boolean | null;
        submittedAt: Date | null;
        isArchived: boolean | null;
    }>;
    update(id: string, updateFeedbackDto: UpdateFeedbackDto, user: User): Promise<{
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
    getFeedbackForRecipient(recipientId: string, viewer: User): Promise<{
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
}
