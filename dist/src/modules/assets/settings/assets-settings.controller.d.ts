import { AssetsSettingsService } from './assets-settings.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class AssetsSettingsController extends BaseController {
    private readonly assetsSettingsService;
    constructor(assetsSettingsService: AssetsSettingsService);
    getAssetSettings(user: User): Promise<{
        multiLevelApproval: boolean;
        approverChain: any;
        fallbackRoles: any;
    }>;
    updateAssetSetting(user: User, key: string, value: any): Promise<void>;
}
