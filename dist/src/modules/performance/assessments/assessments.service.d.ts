import { db } from 'src/drizzle/types/drizzle';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { ClockInOutService } from 'src/modules/time/clock-in-out/clock-in-out.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { GetDashboardAssessmentsDto } from './dto/get-dashboard-assessments.dto';
export declare class AssessmentsService {
    private readonly db;
    private readonly clockInOutService;
    private readonly auditService;
    constructor(db: db, clockInOutService: ClockInOutService, auditService: AuditService);
    createAssessment(dto: CreateAssessmentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        status: "not_started" | "in_progress" | "submitted" | null;
        type: "self" | "manager" | "peer";
        cycleId: string;
        submittedAt: Date | null;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
    }>;
    startAssessment(assessmentId: string, userId: string): Promise<void>;
    saveSectionComments(assessmentId: string, userId: string, dto: SubmitAssessmentDto): Promise<{
        success: boolean;
    }>;
    getAssessmentsForDashboard(companyId: string, filters?: GetDashboardAssessmentsDto): Promise<{
        id: string;
        type: "self" | "manager" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
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
        type: "self" | "manager" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
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
        type: "self" | "manager" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
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
        type: "self" | "manager" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
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
