"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsSettingsService = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let AssetsSettingsService = class AssetsSettingsService {
    constructor(companySettingsService, cache) {
        this.companySettingsService = companySettingsService;
        this.cache = cache;
        this.ttlSeconds = 60 * 60;
    }
    companyTag(companyId) {
        return [
            `company:${companyId}:settings`,
            `company:${companyId}:settings:group:asset`,
        ];
    }
    async getAllAssetSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['assets', 'all'], async () => {
            const settings = await this.companySettingsService.getAllSettings(companyId);
            const assetSettings = {};
            for (const setting of settings) {
                if (setting.key.startsWith('asset.')) {
                    const strippedKey = setting.key.replace('asset.', '');
                    assetSettings[strippedKey] = setting.value;
                }
            }
            return assetSettings;
        }, { ttlSeconds: this.ttlSeconds, tags: this.companyTag(companyId) });
    }
    async getAssetSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['assets', 'config'], async () => {
            const keys = [
                'asset.multi_level_approval',
                'asset.approver_chain',
                'asset.approval_fallback',
            ];
            const rows = await this.companySettingsService.fetchSettings(companyId, keys);
            const parseMaybeJsonArray = (val) => {
                if (Array.isArray(val))
                    return val;
                if (typeof val === 'string' && val.trim().length) {
                    try {
                        const parsed = JSON.parse(val);
                        return Array.isArray(parsed) ? parsed : [];
                    }
                    catch {
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
        }, { ttlSeconds: this.ttlSeconds, tags: this.companyTag(companyId) });
    }
    async updateAssetSetting(companyId, key, value) {
        const settingKey = `asset.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
};
exports.AssetsSettingsService = AssetsSettingsService;
exports.AssetsSettingsService = AssetsSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], AssetsSettingsService);
//# sourceMappingURL=assets-settings.service.js.map