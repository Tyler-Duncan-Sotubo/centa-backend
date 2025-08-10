import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { FeedbackScoreDto } from './dto/feedback-score.dto';
import { AuditService } from 'src/modules/audit/audit.service';
import { PinoLogger } from 'nestjs-pino';
import { CacheService } from 'src/common/cache/cache.service';
export declare class InterviewsService {
    private readonly db;
    private readonly auditService;
    private readonly logger;
    private readonly cache;
    constructor(db: db, auditService: AuditService, logger: PinoLogger, cache: CacheService);
    private allKey;
    private detailKey;
    private appListKey;
    private feedbackKey;
    private burst;
    scheduleInterview(dto: ScheduleInterviewDto, user: User): Promise<{
        id: string;
        mode: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        status: string | null;
        applicationId: string;
        stage: "onsite" | "phone_screen" | "tech" | "final";
        scheduledFor: Date;
        durationMins: number;
        meetingLink: string | null;
        eventId: string | null;
        emailTemplateId: string | null;
    }>;
    rescheduleInterview(interviewId: string, dto: ScheduleInterviewDto, user: User): Promise<{
        id: string;
        applicationId: string;
        stage: "onsite" | "phone_screen" | "tech" | "final";
        scheduledFor: Date;
        durationMins: number;
        meetingLink: string | null;
        eventId: string | null;
        emailTemplateId: string | null;
        status: string | null;
        mode: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    findAllInterviews(companyId: string): Promise<any[]>;
    getInterviewDetails(interviewId: string): Promise<{
        interviewers: {
            interviewId: string;
            interviewerId: string;
            scorecardTemplateId: string | null;
        }[];
        scorecardCriteria: Record<string, any[]>;
        id: string;
        applicationId: string;
        stage: "onsite" | "phone_screen" | "tech" | "final";
        scheduledFor: Date;
        durationMins: number;
        meetingLink: string | null;
        eventId: string | null;
        emailTemplateId: string | null;
        status: string | null;
        mode: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    listInterviewsForApplication(applicationId: string): Promise<{
        id: string;
        applicationId: string;
        stage: "onsite" | "phone_screen" | "tech" | "final";
        scheduledFor: Date;
        durationMins: number;
        meetingLink: string | null;
        eventId: string | null;
        emailTemplateId: string | null;
        status: string | null;
        mode: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    listInterviewerFeedback(interviewId: string): Promise<{
        feedback: Record<string, {
            scores: {
                id: string;
                interviewId: string;
                criterionId: string;
                score: number;
                comment: string | null;
                submittedBy: string | null;
            }[];
            average: number;
        }>;
        overallAverage: number;
    }>;
    upsertInterviewFeedback(interviewId: string, scores: FeedbackScoreDto[], user: User): Promise<{
        success: boolean;
    }>;
}
