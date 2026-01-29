import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { MoveToStageDto } from './dto/move-to-stage.dto';
import { ChangeApplicationStatusDto } from './dto/chnage-app-status.dto';
import { User } from 'src/common/types/user.type';
export declare class ApplicationsController extends BaseController {
    private readonly applicationsService;
    constructor(applicationsService: ApplicationsService);
    submitApplication(createApplicationDto: CreateApplicationDto): Promise<{
        success: boolean;
        applicationId: string;
    }>;
    listApplicationsByJobKanban(jobId: string): Promise<{
        stageId: string;
        stageName: string;
        applications: {
            skills: string[];
            applicationId: string;
            candidateId: string;
            fullName: string;
            email: string;
            appliedAt: Date | null;
            status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
            appSource: "referral" | "agency" | "career_page" | "other" | "linkedin" | "indeed" | "internal";
            resumeScore: unknown;
        }[];
    }[]>;
    findOne(applicationId: string): Promise<{
        application: {
            id: string;
            jobId: string;
            candidateId: string;
            source: "referral" | "agency" | "career_page" | "other" | "linkedin" | "indeed" | "internal";
            status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
            appliedAt: Date | null;
            currentStage: string | null;
            resumeScore: unknown;
            metadata: unknown;
        };
        candidate: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            source: "job_board" | "referral" | "agency" | "career_page" | "headhunter" | "other";
            resumeUrl: string | null;
            profile: unknown;
            createdAt: Date | null;
            updatedAt: Date | null;
        };
        fieldResponses: {
            label: string;
            value: unknown;
        }[];
        questionResponses: {
            question: string;
            answer: string;
        }[];
        stageHistory: {
            name: string;
            movedAt: Date | null;
            movedBy: unknown;
        }[];
        interview: {
            interviewers: {
                id: string;
                name: string;
                email: string;
            }[];
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
        } | null;
    }>;
    moveToStage(dto: MoveToStageDto, user: User): Promise<{
        success: boolean;
    }>;
    changeStatus(dto: ChangeApplicationStatusDto, user: User): Promise<{
        success: boolean;
    }>;
}
