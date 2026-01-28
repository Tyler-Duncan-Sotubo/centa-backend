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
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let PayrollSettingsService = class PayrollSettingsService {
    constructor(companySettingsService) {
        this.companySettingsService = companySettingsService;
    }
    async getAllPayrollSettings(companyId) {
        const settings = await this.companySettingsService.getAllSettings(companyId);
        const payrollSettings = {};
        for (const setting of settings) {
            if (setting.key.startsWith('payroll.')) {
                const strippedKey = setting.key.replace('payroll.', '');
                payrollSettings[strippedKey] = setting.value;
            }
        }
        return payrollSettings;
    }
    async payrollSettings(companyId) {
        return this.companySettingsService.getPayrollConfig(companyId);
    }
    async allowanceSettings(companyId) {
        return this.companySettingsService.getAllowanceConfig(companyId);
    }
    async getApprovalAndProrationSettings(companyId) {
        return this.companySettingsService.getApprovalAndProrationSettings(companyId);
    }
    async getThirteenthMonthSettings(companyId) {
        return this.companySettingsService.getThirteenthMonthSettings(companyId);
    }
    async getLoanSettings(companyId) {
        return this.companySettingsService.getLoanSettings(companyId);
    }
    async updatePayrollSetting(companyId, key, value) {
        const settingKey = `payroll.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
};
exports.PayrollSettingsService = PayrollSettingsService;
exports.PayrollSettingsService = PayrollSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], PayrollSettingsService);
//# sourceMappingURL=payroll-settings.service.js.map