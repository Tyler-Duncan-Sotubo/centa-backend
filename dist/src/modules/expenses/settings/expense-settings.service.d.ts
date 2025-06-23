import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class ExpensesSettingsService {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    getAllExpenseSettings(companyId: string): Promise<Record<string, any>>;
    getExpenseSettings(companyId: string): Promise<{
        multiLevelApproval: boolean;
        approverChain: any;
        fallbackRoles: any;
    }>;
    updateExpenseSetting(companyId: string, key: string, value: any): Promise<void>;
}
