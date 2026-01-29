import { Injectable } from '@nestjs/common';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class AssetsSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  /**
   * Returns all asset.* settings as a flat object with the "asset." prefix stripped.
   * Cached under company:{id}:v{ver}:assets:all
   */
  async getAllAssetSettings(companyId: string): Promise<Record<string, any>> {
    const settings =
      await this.companySettingsService.getAllSettings(companyId);
    const assetSettings: Record<string, any> = {};
    for (const setting of settings) {
      if (setting.key.startsWith('asset.')) {
        const strippedKey = setting.key.replace('asset.', '');
        assetSettings[strippedKey] = setting.value;
      }
    }
    return assetSettings;
  }

  /**
   * Returns the asset approval config.
   * Cached under company:{id}:v{ver}:assets:config
   */
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

    const parseMaybeJsonArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val as string[];
      if (typeof val === 'string' && val.trim().length) {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    return {
      multiLevelApproval: Boolean(rows['asset.multi_level_approval']),
      approverChain: parseMaybeJsonArray(rows['asset.approver_chain']),
      fallbackRoles: parseMaybeJsonArray(rows['asset.approval_fallback']),
    };
  }

  /**
   * Updates a single asset.* setting.
   * This routes through CompanySettingsService.setSetting, which bumps the company version,
   * so any cached reads under the current version naturally fall out.
   */
  async updateAssetSetting(
    companyId: string,
    key: string,
    value: any,
  ): Promise<void> {
    const settingKey = `asset.${key}`;
    await this.companySettingsService.setSetting(companyId, settingKey, value);
  }
}
