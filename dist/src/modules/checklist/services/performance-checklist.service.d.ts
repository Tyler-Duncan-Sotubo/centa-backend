import { db } from 'src/drizzle/types/drizzle';
import { TaskStatus } from '../constants/constants';
export declare const PERFORMANCE_EXTRA_KEYS: readonly ["performance_general", "goal_policies", "feedback_settings", "competency", "performance_templates", "appraisal_framework", "start_1_1_checkin"];
export type PerformanceExtraKey = (typeof PERFORMANCE_EXTRA_KEYS)[number];
export declare class PerformanceChecklistService {
    private db;
    constructor(db: db);
    private getExtraStatuses;
    getPerformanceChecklist(companyId: string): Promise<{
        tasks: Record<string, TaskStatus>;
        required: ("performance_general" | "goal_policies" | "feedback_settings" | "competency" | "performance_templates" | "appraisal_framework" | "start_1_1_checkin")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
}
