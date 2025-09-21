import { db } from 'src/drizzle/types/drizzle';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { TaskStatus } from '../constants/constants';
type ExtraKey = 'onboarding_templates' | 'offboarding_process';
export declare class StaffChecklistService {
    private readonly settings;
    private db;
    constructor(settings: CompanySettingsService, db: db);
    private getExtraStatuses;
    markExtraDone(companyId: string, key: ExtraKey, userId: string): Promise<void>;
    getStaffChecklist(companyId: string): Promise<{
        tasks: Record<string, TaskStatus>;
        required: any[];
        completed: boolean;
        disabledWhenComplete: any;
    }>;
}
export {};
