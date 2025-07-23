import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { FeedbackScoreDto } from './dto/feedback-score.dto';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class InterviewsService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    scheduleInterview(dto: ScheduleInterviewDto): Promise<{
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
    rescheduleInterview(interviewId: string, dto: ScheduleInterviewDto): Promise<{
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
    findAllInterviews(companyId: string): Promise<{
        id: string;
        applicationId: string;
        scheduledFor: Date;
        durationMins: number;
        stage: "onsite" | "phone_screen" | "tech" | "final";
        mode: string | null;
        meetingLink: string | null;
        candidateName: string;
        interviewers: {
            interviewerId: string;
            scorecardTemplateId: string | null;
        }[];
        scorecardCriteria: {
            id: string;
            label: string;
            description: string | null;
            maxScore: number;
            order: number;
            templateId: string;
        }[];
    }[]>;
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
