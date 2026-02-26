import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { SelfAssessmentsService } from './self-assessments.service';
export declare class SelfAssessmentsController extends BaseController {
    private readonly selfAssessmentsService;
    constructor(selfAssessmentsService: SelfAssessmentsService);
    getOrCreateForCycle(cycleId: string, user: User): Promise<{
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
    start(id: string, user: User): Promise<{
        success: boolean;
    }>;
    submit(id: string, user: User): Promise<{
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
    upsertSummary(id: string, body: {
        summary: string;
    }, user: User): Promise<{
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        createdBy: string;
        summary: string;
        assessmentId: string;
        updatedBy: string;
    }>;
}
