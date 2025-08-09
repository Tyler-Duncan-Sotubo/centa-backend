import { PinoLogger } from 'nestjs-pino';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
import { CacheService } from 'src/common/cache/cache.service';
export declare class ExpensesSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    private readonly logger;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService, logger: PinoLogger);
    private allKey;
    private oneKey;
    private safeJson;
    getAllExpenseSettings(companyId: string): Promise<Record<string, any>>;
    getExpenseSettings(companyId: string): Promise<{
        multiLevelApproval: boolean;
        approverChain: string[];
        fallbackRoles: string[];
    }>;
    updateExpenseSetting(companyId: string, key: string, value: any): Promise<void>;
}
