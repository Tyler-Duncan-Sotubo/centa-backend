import { db } from 'src/drizzle/types/drizzle';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { ClockInOutService } from 'src/modules/time/clock-in-out/clock-in-out.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { GetDashboardAssessmentsDto } from './dto/get-dashboard-assessments.dto';
import { CacheService } from 'src/common/cache/cache.service';
export declare class AssessmentsService {
    private readonly db;
    private readonly clockInOutService;
    private readonly auditService;
    private readonly cache;
    constructor(db: db, clockInOutService: ClockInOutService, auditService: AuditService, cache: CacheService);
    private tags;
    private invalidate;
    private serializeFilters;
    createAssessment(dto: CreateAssessmentDto, user: User): Promise<{
        status: "in_progress" | "submitted" | "not_started" | null;
        id: string;
        createdAt: Date | null;
        companyId: string;
        type: "manager" | "self" | "peer";
        templateId: string;
        submittedAt: Date | null;
        cycleId: string;
        revieweeId: string;
        reviewerId: string;
    }>;
    startAssessment(assessmentId: string, userId: string): Promise<void>;
    saveSectionComments(assessmentId: string, userId: string, dto: SubmitAssessmentDto): Promise<{
        success: boolean;
    }>;
    getAssessmentsForDashboard(companyId: string, filters?: GetDashboardAssessmentsDto): Promise<{
        id: string;
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
        reviewer: string;
        employee: string;
        departmentName: any;
        jobRoleName: string | null;
        createdAt: Date | null;
        submittedAt: Date | null;
        progress: number;
        dueDate: string | null;
        score: number | null;
    }[]>;
    getAssessmentById(assessmentId: string): Promise<any>;
    getAssessmentsForUser(userId: string): Promise<{
        id: string;
        companyId: string;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
    }[]>;
    getTeamAssessments(managerId: string, cycleId: string): Promise<{
        id: string;
        companyId: string;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
    }[]>;
    getReviewSummary(revieweeId: string, cycleId: string): Promise<{
        id: string;
        companyId: string;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
    }[]>;
    private getAttendanceSummaryForCycle;
    private calculateProgress;
    getResponsesForFeedback(feedbackIds: string[]): Promise<{
        feedbackId: string;
        questionId: string;
    }[]>;
}
