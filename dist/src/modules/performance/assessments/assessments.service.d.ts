import { db } from 'src/drizzle/types/drizzle';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { ClockInOutService } from 'src/modules/time/clock-in-out/clock-in-out.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { GetDashboardAssessmentsDto } from './dto/get-dashboard-assessments.dto';
import { CacheService } from 'src/common/cache/cache.service';
type AssessmentCounts = {
    all: number;
    not_started: number;
    in_progress: number;
    submitted: number;
};
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
        id: string;
        createdAt: Date | null;
        companyId: string;
        status: "submitted" | "in_progress" | "not_started" | null;
        type: "manager" | "self" | "peer";
        submittedAt: Date | null;
        templateId: string;
        cycleId: string;
        reviewerId: string;
        revieweeId: string;
    }>;
    startAssessment(assessmentId: string, userId: string): Promise<void>;
    saveSectionComments(assessmentId: string, userId: string, dto: SubmitAssessmentDto): Promise<{
        success: boolean;
    }>;
    getAssessmentsForDashboard(companyId: string, filters?: GetDashboardAssessmentsDto): Promise<{
        id: string;
        type: "manager" | "self" | "peer";
        status: "submitted" | "in_progress" | "not_started" | null;
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
    getCounts(companyId: string, opts?: {
        cycleId?: string;
        reviewerId?: string;
        departmentId?: string;
    }): Promise<AssessmentCounts>;
    getAssessmentById(assessmentId: string): Promise<any>;
    getAssessmentsForUser(userId: string): Promise<{
        id: string;
        companyId: string;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        type: "manager" | "self" | "peer";
        status: "submitted" | "in_progress" | "not_started" | null;
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
        status: "submitted" | "in_progress" | "not_started" | null;
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
        status: "submitted" | "in_progress" | "not_started" | null;
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
export {};
