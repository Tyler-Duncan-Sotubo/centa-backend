import { db } from 'src/drizzle/types/drizzle';
import { TaskStatus } from '../constants/constants';
export declare const LEAVE_EXTRA_KEYS: readonly ["leave_settings", "leave_types_policies", "holidays", "blocked_days", "reserved_days"];
export type LeaveExtraKey = (typeof LEAVE_EXTRA_KEYS)[number];
export declare class LeaveChecklistService {
    private db;
    constructor(db: db);
    private getExtraStatuses;
    getLeaveChecklist(companyId: string): Promise<{
        tasks: Record<string, TaskStatus>;
        required: string[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
}
