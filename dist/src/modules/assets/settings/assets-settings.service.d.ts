import { CompanySettingsService } from 'src/company-settings/company-settings.service';
export declare class AssetsSettingsService {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    getAllAssetSettings(companyId: string): Promise<Record<string, any>>;
    getAssetSettings(companyId: string): Promise<{
        multiLevelApproval: boolean;
        approverChain: string[];
        fallbackRoles: string[];
    }>;
    updateAssetSetting(companyId: string, key: string, value: any): Promise<void>;
}
