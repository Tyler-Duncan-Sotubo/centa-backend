import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { GetDashboardAssessmentsDto } from './dto/get-dashboard-assessments.dto';
export declare class AssessmentsController extends BaseController {
    private readonly assessmentsService;
    constructor(assessmentsService: AssessmentsService);
    create(dto: CreateAssessmentDto, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        companyId: string;
        type: "manager" | "self" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        submittedAt: Date | null;
    }>;
    start(id: string, user: User): Promise<void>;
    submit(id: string, dto: SubmitAssessmentDto, user: User): Promise<{
        success: boolean;
    }>;
    getDashboard(user: User, filters: GetDashboardAssessmentsDto): Promise<{
        id: string;
        type: "manager" | "self" | "peer";
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
    getCounts(user: User): Promise<{
        all: number;
        not_started: number;
        in_progress: number;
        submitted: number;
    }>;
    getById(id: string): Promise<any>;
    getOwnAssessments(user: User): Promise<{
        id: string;
        companyId: string;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        type: "manager" | "self" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
    }[]>;
    getOwnSelfAssessments(employeeId: string): Promise<{
        id: string;
        cycleName: string | null;
        type: "manager" | "self" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
    }[]>;
    getTeamAssessments(cycleId: string, user: User): Promise<{
        id: string;
        companyId: string;
        cycleId: string;
        templateId: string;
        reviewerId: string;
        revieweeId: string;
        type: "manager" | "self" | "peer";
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
        type: "manager" | "self" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
    }[]>;
}
