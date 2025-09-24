import { db } from 'src/drizzle/types/drizzle';
import { TaskStatus } from '../constants/constants';
export declare const ATTENDANCE_EXTRA_KEYS: readonly ["attendance_setting", "shift_management", "assign_rota", "add_office_location"];
export type AttendanceExtraKey = (typeof ATTENDANCE_EXTRA_KEYS)[number];
export declare class AttendanceChecklistService {
    private db;
    constructor(db: db);
    private getExtraStatuses;
    getAttendanceChecklist(companyId: string): Promise<{
        tasks: Record<string, TaskStatus>;
        required: ("attendance_setting" | "shift_management" | "assign_rota" | "add_office_location")[];
        completed: boolean;
        disabledWhenComplete: boolean;
    }>;
}
