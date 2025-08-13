import { Injectable } from '@nestjs/common';
import { CacheService } from 'src/common/cache/cache.service';
import { CompanySettingsService } from 'src/company-settings/company-settings.service';

@Injectable()
export class AssetsSettingsService {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
    private readonly cache: CacheService,
  ) {}

  private ttlSeconds = 60 * 60; // tune as needed

  private companyTag(companyId: string) {
    return [
      `company:${companyId}:settings`,
      `company:${companyId}:settings:group:asset`,
    ];
  }

  /**
   * Returns all asset.* settings as a flat object with the "asset." prefix stripped.
   * Cached under company:{id}:v{ver}:assets:all
   */
  async getAllAssetSettings(companyId: string): Promise<Record<string, any>> {
    return this.cache.getOrSetVersioned<Record<string, any>>(
      companyId,
      ['assets', 'all'],
      async () => {
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.companyTag(companyId) },
    );
  }

  /**
   * Returns the asset approval config.
   * Cached under company:{id}:v{ver}:assets:config
   */
  async getAssetSettings(companyId: string) {
    return this.cache.getOrSetVersioned<{
      multiLevelApproval: boolean;
      approverChain: string[];
      fallbackRoles: string[];
    }>(
      companyId,
      ['assets', 'config'],
      async () => {
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
      },
      { ttlSeconds: this.ttlSeconds, tags: this.companyTag(companyId) },
    );
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
    // No manual cache delete needed: version bump invalidates prior keys.
  }
}
