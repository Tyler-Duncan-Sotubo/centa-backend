import { ReportService } from './report.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { User } from 'src/common/types/user.type';
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
    getOverview(user: User): Promise<{
        performanceCycle: null;
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
        assessmentActivity: {
            total: number;
            submitted: number;
            inProgress: number;
            notStarted: number;
            avgScore: number;
            recommendationCounts: {};
        };
        topEmployees: never[];
    } | {
        performanceCycle: {
            id: string;
            name: string;
            startDate: string;
            endDate: string;
            status: string | null;
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
        assessmentActivity: {
            total: number;
            submitted: number;
            inProgress: number;
            notStarted: number;
            avgScore: number;
            recommendationCounts: Record<string, number>;
        };
        topEmployees: ({
            source: "performance";
            employeeId: any;
            employeeName: string;
            departmentName: any;
            jobRoleName: string | null;
            finalScore: number | null;
            promotionRecommendation: string | null;
            potentialFlag: boolean | null;
        } | {
            source: "performance";
            employeeId: any;
            employeeName: string;
            departmentName: any;
            jobRoleName: string | null;
            finalScore: number | null;
            promotionRecommendation: string | null;
            potentialFlag: boolean | null;
        } | {
            source: "performance";
            employeeId: any;
            employeeName: string;
            departmentName: any;
            jobRoleName: string | null;
            finalScore: number | null;
            promotionRecommendation: string | null;
            potentialFlag: boolean | null;
        } | {
            source: "performance";
            employeeId: any;
            employeeName: string;
            departmentName: any;
            jobRoleName: string | null;
            finalScore: number | null;
            promotionRecommendation: string | null;
            potentialFlag: boolean | null;
        })[];
    }>;
    getReportsFilters(user: User): Promise<{
        cycles: {
            id: string;
            name: string;
        }[];
        employeesList: ({
            id: any;
            name: string;
        } | {
            id: any;
            name: string;
        })[];
        departmentsList: ({
            id: any;
            name: any;
        } | {
            id: any;
            name: any;
        })[];
    }>;
    getGoalReport(user: User, filter?: GetGoalReportDto): Promise<({
        goalId: string;
        employeeId: any;
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
        employeeId: any;
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
        employeeId: any;
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
        employeeId: any;
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
    getFeedbackReport(user: User, filter: GetFeedbackReportDto): Promise<({
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
    } | {
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
    })[]>;
    getAssessmentReport(user: User, filter?: GetAssessmentReportDto): Promise<({
        id: string;
        employeeId: string;
        type: "peer" | "manager" | "self";
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
        type: "peer" | "manager" | "self";
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
        type: "peer" | "manager" | "self";
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
        source: "performance";
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        source: "performance";
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        source: "performance";
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        source: "performance";
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    })[]>;
    exportTopEmployees(user: User, filters: GetTopEmployeesDto, format?: 'csv' | 'pdf'): Promise<{
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
