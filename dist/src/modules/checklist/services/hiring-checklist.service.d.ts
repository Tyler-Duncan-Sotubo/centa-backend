import { db } from 'src/drizzle/types/drizzle';
import { TaskStatus } from '../constants/constants';
export declare const HIRING_EXTRA_KEYS: readonly ["pipeline", "scorecards", "email_templates", "offer_templates", "create_jobs", "google_integration"];
export type HiringExtraKey = (typeof HIRING_EXTRA_KEYS)[number];
export declare class HiringChecklistService {
    private db;
    constructor(db: db);
    private getExtraStatuses;
    getHiringChecklist(companyId: string): Promise<{
        tasks: Record<string, TaskStatus>;
        required: ("pipeline" | "scorecards" | "email_templates" | "offer_templates" | "create_jobs" | "google_integration")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
}
