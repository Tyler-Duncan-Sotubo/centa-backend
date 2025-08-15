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
exports.PayrollSettingsService = void 0;
const common_1 = require("@nestjs/common");
const cache_service_1 = require("../../../common/cache/cache.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let PayrollSettingsService = class PayrollSettingsService {
    constructor(companySettingsService, cache) {
        this.companySettingsService = companySettingsService;
        this.cache = cache;
    }
    tags(companyId) {
        return [
            `company:${companyId}:settings`,
            `company:${companyId}:settings:group:payroll`,
        ];
    }
    async getAllPayrollSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payroll', 'all'], async () => {
            const settings = await this.companySettingsService.getAllSettings(companyId);
            const payrollSettings = {};
            for (const setting of settings) {
                if (setting.key.startsWith('payroll.')) {
                    const strippedKey = setting.key.replace('payroll.', '');
                    payrollSettings[strippedKey] = setting.value;
                }
            }
            return payrollSettings;
        }, { tags: this.tags(companyId) });
    }
    async payrollSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payroll', 'config'], () => this.companySettingsService.getPayrollConfig(companyId), { tags: this.tags(companyId) });
    }
    async allowanceSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payroll', 'allowance'], () => this.companySettingsService.getAllowanceConfig(companyId), { tags: this.tags(companyId) });
    }
    async getApprovalAndProrationSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payroll', 'approval_proration'], () => this.companySettingsService.getApprovalAndProrationSettings(companyId), { tags: this.tags(companyId) });
    }
    async getThirteenthMonthSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payroll', '13th_month'], () => this.companySettingsService.getThirteenthMonthSettings(companyId), { tags: this.tags(companyId) });
    }
    async getLoanSettings(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['payroll', 'loan'], () => this.companySettingsService.getLoanSettings(companyId), { tags: this.tags(companyId) });
    }
    async updatePayrollSetting(companyId, key, value) {
        const settingKey = `payroll.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
};
exports.PayrollSettingsService = PayrollSettingsService;
exports.PayrollSettingsService = PayrollSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService])
], PayrollSettingsService);
//# sourceMappingURL=payroll-settings.service.js.map