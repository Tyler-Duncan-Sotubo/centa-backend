import { db } from 'src/drizzle/types/drizzle';
import { User } from 'src/common/types/user.type';
import { GetAppraisalReportDto } from './dto/get-appraisal-report.dto';
import { GetGoalReportDto } from './dto/get-goal-report.dto';
import { GetFeedbackReportDto } from './dto/get-feedback-report.dto';
import { GetAssessmentReportDto } from './dto/get-assessment-report.dto';
import { GetTopEmployeesDto } from './dto/get-top-employees.dto';
export declare class ReportService {
    private readonly db;
    constructor(db: db);
    reportFilters(companyId: string): Promise<{
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
        appraisalCycles: {
            id: string;
            name: string;
        }[];
    }>;
    getAppraisalReport(user: User, filters?: GetAppraisalReportDto): Promise<({
        cycleId: string;
        cycleName: string;
        appraisalId: string;
        employeeId: any;
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
        employeeId: any;
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
        employeeId: any;
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
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        appraisalNote: string | null;
        appraisalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
        submittedAt: Date | null;
    })[]>;
    getGoalReport(user: User, filters?: GetGoalReportDto): Promise<({
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    } | {
        goalId: any;
        employeeId: any;
        employeeName: string;
        jobRoleName: string | null;
        departmentName: any;
        title: any;
        description: any;
        type: any;
        status: any;
        weight: any;
        startDate: any;
        dueDate: any;
    })[]>;
    getFeedbackReport(user: User, filters: GetFeedbackReportDto): Promise<({
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
    getAssessmentReportSummary(user: User, filters?: GetAssessmentReportDto): Promise<({
        id: string;
        employeeId: string;
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
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
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
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
        type: "manager" | "self" | "peer";
        status: "in_progress" | "submitted" | "not_started" | null;
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
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
    } | {
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
    } | {
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
    } | {
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: "promote" | "hold" | "exit" | null;
    })[] | ({
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    } | {
        employeeId: any;
        employeeName: string;
        departmentName: any;
        jobRoleName: string | null;
        finalScore: number | null;
        promotionRecommendation: string | null;
        potentialFlag: boolean | null;
    })[]>;
    getCompetencyHeatmap(user: User, filters?: {
        cycleId: string;
    }): Promise<never[] | Record<string, {
        [level: string]: number;
    }>>;
    getParticipationReport(user: User, filters?: {
        cycleId?: string;
    }): Promise<{
        employeeId: any;
        employeeName: string;
        submittedByEmployee: boolean | null;
        submittedByManager: boolean | null;
        finalized: boolean | null;
        completed: boolean;
    }[]>;
    getPerformanceOverview(user: User): Promise<never[] | {
        appraisalCycle: {
            id: string;
            name: string;
            startDate: string;
            endDate: string;
            status: "active" | "closed" | "upcoming";
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
}
