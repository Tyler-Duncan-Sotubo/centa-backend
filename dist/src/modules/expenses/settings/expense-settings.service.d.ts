import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class ExpensesSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService);
    private ttlSeconds;
    private tags;
    getAllExpenseSettings(companyId: string): Promise<Record<string, any>>;
    getExpenseSettings(companyId: string): Promise<{
        multiLevelApproval: boolean;
        approverChain: string[];
        fallbackRoles: string[];
    }>;
    updateExpenseSetting(companyId: string, key: string, value: any): Promise<void>;
}
