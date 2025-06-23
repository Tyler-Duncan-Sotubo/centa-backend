import { CompanySettingsService } from './company-settings.service';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class CompanySettingsController extends BaseController {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    getDefaultManager(user: User): Promise<{
        defaultManager: string;
    }>;
    updateDefaultManager(user: User, body: {
        value: string;
        key: string;
    }): Promise<void>;
    getTwoFactorAuthSetting(user: User): Promise<{
        twoFactorAuth: boolean;
    }>;
    updateTwoFactorAuthSetting(user: User, body: {
        value: boolean;
        key: string;
    }): Promise<void>;
    getOnboardingStep(user: User): Promise<{
        payFrequency: boolean;
        payGroup: boolean;
        taxDetails: boolean;
        companyLocations: boolean;
        departments: boolean;
        jobRoles: boolean;
        costCenter: boolean;
        uploadEmployees: boolean;
    }>;
}
