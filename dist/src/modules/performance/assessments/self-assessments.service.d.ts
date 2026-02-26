import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { User } from 'src/common/types/user.type';
export declare class SelfAssessmentsService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private invalidate;
    private getEmployeeOrThrow;
    private getCycleOrThrow;
    private pickSelfTemplateOrThrow;
    private getOrCreateSelfAssessment;
    getSelfAssessmentPayload(user: User, cycleId: string): Promise<{
        assessment: any;
        employee: {
            id: any;
            name: string;
        };
        template: {
            id: any;
            name: any;
            includeGoals: boolean;
            includeQuestionnaire: boolean;
        };
        questions: Record<string, {
            questionId: string;
            question: string;
            type: string;
            isGlobal: boolean | null;
            response: string | null;
            order: number | null;
            isMandatory: boolean | null;
            competency: string | null;
        }[]> | null;
        goals: ({
            progress: number;
            id: any;
            title: any;
            dueDate: any;
            weight: any;
            status: any;
        } | {
            progress: number;
            id: any;
            title: any;
            dueDate: any;
            weight: any;
            status: any;
        })[] | null;
        selfSummary: {
            summary: string;
            updatedAt: Date | null;
        };
    }>;
    upsertSelfSummary(user: User, assessmentId: string, summary: string): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        createdBy: string;
        summary: string;
        assessmentId: string;
        updatedBy: string;
    }>;
    startSelfAssessment(user: User, assessmentId: string): Promise<{
        success: boolean;
    }>;
    submitSelfAssessment(user: User, assessmentId: string): Promise<{
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
    }>;
    private getQuestionsWithResponses;
    private getGoalsForEmployeeCycle;
}
