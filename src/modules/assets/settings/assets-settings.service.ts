import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class AssetsSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  async getAllAssetSettings(companyId: string): Promise<Record<string, any>> {
    const settings =
      await this.companySettingsService.getAllSettings(companyId);
    const assetSettings = {};

    for (const setting of settings) {
      if (setting.key.startsWith('asset.')) {
        const strippedKey = setting.key.replace('asset.', '');
        assetSettings[strippedKey] = setting.value;
      }
    }

    return assetSettings;
  }

  async getAssetSettings(companyId: string) {
    const keys = [
      'asset.multi_level_approval',
      'asset.approver_chain',
      'asset.approval_fallback',
    ];

    const rows = await this.companySettingsService.fetchSettings(
      companyId,
      keys,
    );

    return {
      multiLevelApproval: Boolean(rows['asset.multi_level_approval']),
      approverChain: Array.isArray(rows['asset.approver_chain'])
        ? rows['asset.approver_chain']
        : JSON.parse(rows['asset.approver_chain'] || '[]'),
      fallbackRoles: Array.isArray(rows['asset.approval_fallback'])
        ? rows['asset.approval_fallback']
        : JSON.parse(rows['asset.approval_fallback'] || '[]'),
    };
  }

  async updateAssetSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `asset.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
