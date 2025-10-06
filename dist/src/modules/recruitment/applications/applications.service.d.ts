import { CreateApplicationDto, FieldResponseDto } from './dto/create-application.dto';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { AwsService } from 'src/common/aws/aws.service';
import { MoveToStageDto } from './dto/move-to-stage.dto';
import { ChangeApplicationStatusDto } from './dto/chnage-app-status.dto';
import { User } from 'src/common/types/user.type';
import { ResumeScoringService } from './resume-scoring.service';
import { Queue } from 'bullmq';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ApplicationsService {
    private readonly db;
    private readonly queue;
    private readonly awsService;
    private readonly auditService;
    private readonly resumeScoring;
    private readonly cache;
    constructor(db: db, queue: Queue, awsService: AwsService, auditService: AuditService, resumeScoring: ResumeScoringService, cache: CacheService);
    private tags;
    submitApplication(dto: CreateApplicationDto): Promise<{
        success: boolean;
        applicationId: string;
    }>;
    getApplicationDetails(applicationId: string): Promise<{
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
        } | null;
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
    moveToStage(dto: MoveToStageDto, user: User): Promise<{
        success: boolean;
    }>;
    changeStatus(dto: ChangeApplicationStatusDto, user: User): Promise<{
        success: boolean;
    }>;
    ensureSkillsExist(skillNames: string[]): Promise<{
        id: string;
        name: string;
    }[]>;
    handleFileUploads(fieldResponses: FieldResponseDto[], email: string): Promise<FieldResponseDto[]>;
}
