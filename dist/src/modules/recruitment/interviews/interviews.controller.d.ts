import { InterviewsService } from './interviews.service';
import { ScorecardTemplateService } from './scorecard.service';
import { User } from 'src/common/types/user.type';
import { CreateScorecardTemplateDto } from './dto/create-score-card.dto';
import { SubmitFeedbackDto } from './dto/feedback-score.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { InterviewEmailTemplateService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/email-template.dto';
export declare class InterviewsController extends BaseController {
    private readonly interviewsService;
    private readonly scoreCard;
    private readonly emailTemplatesService;
    constructor(interviewsService: InterviewsService, scoreCard: ScorecardTemplateService, emailTemplatesService: InterviewEmailTemplateService);
    scheduleInterview(dto: ScheduleInterviewDto, user: User): Promise<{
        id: string;
        mode: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        status: string | null;
        applicationId: string;
        stage: "phone_screen" | "tech" | "onsite" | "final";
        scheduledFor: Date;
        durationMins: number;
        meetingLink: string | null;
        eventId: string | null;
        emailTemplateId: string | null;
    }>;
    rescheduleInterview(interviewId: string, dto: ScheduleInterviewDto, user: User): Promise<{
        id: string;
        applicationId: string;
        stage: "phone_screen" | "tech" | "onsite" | "final";
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
    listAllInterviews(user: User): Promise<any[]>;
    getInterviewDetails(interviewId: string): Promise<{
        interviewers: {
            interviewId: string;
            interviewerId: string;
            scorecardTemplateId: string | null;
        }[];
        scorecardCriteria: Record<string, any[]>;
        id: string;
        applicationId: string;
        stage: "phone_screen" | "tech" | "onsite" | "final";
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
    submitInterviewFeedback(interviewId: string, dto: SubmitFeedbackDto, user: User): Promise<{
        success: boolean;
    }>;
    listInterviewsForApplication(applicationId: string): Promise<{
        id: string;
        applicationId: string;
        stage: "phone_screen" | "tech" | "onsite" | "final";
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
    getAllScorecards(user: User): Promise<{
        id: string;
        name: string;
        description: string | null;
        isSystem: boolean | null;
        createdAt: Date | null;
        criteria: unknown;
    }[]>;
    createScorecardTemplate(dto: CreateScorecardTemplateDto, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        isSystem: boolean | null;
        description: string | null;
    }>;
    deleteScorecardTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
    cloneScorecardTemplate(templateId: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        isActive: boolean | null;
        companyId: string | null;
        isSystem: boolean | null;
        description: string | null;
    }>;
    getAllEmailTemplates(user: User): Promise<{
        id: string;
        name: string;
        subject: string;
        body: string;
        isGlobal: boolean | null;
        companyId: string | null;
        createdBy: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    createEmailTemplate(dto: CreateEmailTemplateDto, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string | null;
        createdBy: string | null;
        body: string;
        isGlobal: boolean | null;
        subject: string;
    }>;
    cloneEmailTemplate(templateId: string, user: User): Promise<{
        id: string;
        name: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        companyId: string | null;
        createdBy: string | null;
        body: string;
        isGlobal: boolean | null;
        subject: string;
    }>;
    deleteEmailTemplate(templateId: string, user: User): Promise<{
        message: string;
    }>;
}
