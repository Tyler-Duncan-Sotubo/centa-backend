import { ReportService } from './report.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
import { GetAppraisalReportDto } from './dto/get-appraisal-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
import { PerformanceExportService } from './csv-performance-export.service';
import { PerformancePdfExportService } from './performance-pdf-export.service';
export declare class ReportController extends BaseController {
    private readonly reportService;
    private readonly csv;
    private readonly pdf;
    constructor(reportService: ReportService, csv: PerformanceExportService, pdf: PerformancePdfExportService);
    getOverview(user: User): Promise<never[] | {
        appraisalCycle: {
            id: string;
            name: string;
            startDate: string;
            endDate: string;
            status: "active" | "upcoming" | "closed";
        };
        cycleHealth: {
            totalAppraisals: number;
            completedAppraisals: number;
            completionRate: number;
            onTimeCount: number;
            overdueCount: number;
            avgTimeToCompleteDays: number;
        };
        appraisalOutcomes: {
            avgScore: number;
            scoreDistribution: {
                '0-50': number;
                '51-70': number;
                '71-85': number;
                '86-100': number;
            };
            recommendationCounts: Record<string, number>;
        };
        goalPerformance: {
            totalGoals: number;
            completedGoals: number;
            overdueGoals: number;
        };
        feedbackActivity: {
            peerCount: number;
            managerCount: number;
            selfCount: number;
            avgPerEmployee: number;
            anonymityRate: number;
        };
        competencyInsights: {
            heatmap: never[] | Record<string, {
                [level: string]: number;
            }>;
        };
        participation: {
            total: number;
            completed: number;
            completionRate: number;
        };
        topEmployees: any[];
    }>;
    getReportsFilters(user: User): Promise<{
        cycles: {
            id: string;
            name: string;
        }[];
        employeesList: {
            id: string;
            name: string;
        }[];
        departmentsList: ({
            id: any;
            name: any;
        } | {
            id: any;
            name: any;
        })[];
        appraisalCycles: {
            id: string;
            name: string;
        }[];
    }>;
    getAppraisalReport(user: User, cycleId: string, filter?: GetAppraisalReportDto): Promise<({
        cycleId: string;
        cycleName: string;
        appraisalId: string;
        employeeId: string;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        appraisalNote: string | null;
        appraisalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
        submittedAt: Date | null;
    } | {
        cycleId: string;
        cycleName: string;
        appraisalId: string;
        employeeId: string;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        appraisalNote: string | null;
        appraisalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
        submittedAt: Date | null;
    })[]>;
    getGoalReport(user: User, filter?: GetGoalReportDto): Promise<({
        goalId: string;
        employeeId: string;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: string;
        description: string | null;
        type: string | null;
        status: string | null;
        weight: number | null;
        startDate: string;
        dueDate: string;
    } | {
        goalId: string;
        employeeId: string;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: string;
        description: string | null;
        type: string | null;
        status: string | null;
        weight: number | null;
        startDate: string;
        dueDate: string;
    })[]>;
    getFeedbackReport(user: User, filter: GetFeedbackReportDto): Promise<{
        senderName: string | undefined;
        responses: {
            questionText: string;
            answer: string;
            order: number;
        }[];
        feedbackId: string;
        recipientId: string;
        isAnonymous: boolean | null;
        submittedAt: Date | null;
        senderId: string;
        employeeName: string;
    }[]>;
    getAssessmentReport(user: User, filter?: GetAssessmentReportDto): Promise<({
        id: string;
        employeeId: string;
        type: "self" | "manager" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
        reviewerId: string;
        revieweeName: string;
        reviewerName: string;
        departmentName: any;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        id: string;
        employeeId: string;
        type: "self" | "manager" | "peer";
        status: "not_started" | "in_progress" | "submitted" | null;
        submittedAt: Date | null;
        createdAt: Date | null;
        reviewerId: string;
        revieweeName: string;
        reviewerName: string;
        departmentName: any;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    })[]>;
    getTopEmployees(user: User, filter: GetTopEmployeesDto): Promise<({
        employeeId: string;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
    } | {
        employeeId: string;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
    })[] | ({
        employeeId: string;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        employeeId: string;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    })[]>;
    getCompetencyHeatmap(user: User, filters: {
        cycleId: string;
    }): Promise<never[] | Record<string, {
        [level: string]: number;
    }>>;
    exportAppraisalReport(user: User, format: "csv" | "pdf" | undefined, filters: GetAppraisalReportDto): Promise<{
        url: string | {
            url: string;
            record: any;
        };
    }>;
    exportTopEmployees(user: User, filters: GetTopEmployeesDto, format?: 'csv' | 'pdf'): Promise<{
        url: string | {
            url: string;
            record: any;
        };
    }>;
    exportCompetencyHeatmap(user: User, cycleId: string, format?: 'csv' | 'pdf'): Promise<{
        url: string | {
            url: string;
            record: any;
        };
    }>;
    exportGoalReport(user: User, cycleId: string, format: "csv" | "pdf" | undefined, filters: GetGoalReportDto): Promise<{
        url: string | {
            url: string;
            record: any;
        };
    }>;
    exportFeedbackReport(user: User, filters: GetFeedbackReportDto, format?: 'csv' | 'pdf'): Promise<{
        url: string | {
            url: string;
            record: any;
        };
    }>;
    exportAssessmentReport(user: User, format: "csv" | "pdf" | undefined, filters: GetAssessmentReportDto): Promise<{
        url: string | {
            url: string;
            record: any;
        };
    }>;
}
