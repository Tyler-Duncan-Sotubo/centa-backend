import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class AssetsSettingsService {
    private readonly companySettingsService;
    private readonly cache;
    constructor(companySettingsService: CompanySettingsService, cache: CacheService);
    private ttlSeconds;
    private companyTag;
    getAllAssetSettings(companyId: string): Promise<Record<string, any>>;
    getAssetSettings(companyId: string): Promise<{
        multiLevelApproval: boolean;
        approverChain: string[];
        fallbackRoles: string[];
    }>;
    updateAssetSetting(companyId: string, key: string, value: any): Promise<void>;
}
