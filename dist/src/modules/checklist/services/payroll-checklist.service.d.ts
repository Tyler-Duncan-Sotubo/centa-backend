import { db } from 'src/drizzle/types/drizzle';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { TaskStatus } from '../constants/constants';
export declare class PayrollChecklistService {
    private readonly companySettings;
    private db;
    constructor(companySettings: CompanySettingsService, db: db);
    private getExtraStatuses;
    getPayrollChecklist(companyId: string): Promise<{
        tasks: Record<string, TaskStatus>;
        required: any;
        completed: any;
        disabledWhenComplete: any;
    }>;
}
