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
exports.ExpensesSettingsService = void 0;
const common_1 = require("@nestjs/common");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let ExpensesSettingsService = class ExpensesSettingsService {
    constructor(companySettingsService) {
        this.companySettingsService = companySettingsService;
    }
    async getAllExpenseSettings(companyId) {
        const settings = await this.companySettingsService.getAllSettings(companyId);
        const expenseSettings = {};
        for (const setting of settings) {
            if (setting.key.startsWith('expense.')) {
                const strippedKey = setting.key.replace('expense.', '');
                expenseSettings[strippedKey] = setting.value;
            }
        }
        return expenseSettings;
    }
    async getExpenseSettings(companyId) {
        const keys = [
            'expense.multi_level_approval',
            'expense.approver_chain',
            'expense.approval_fallback',
        ];
        const rows = await this.companySettingsService.fetchSettings(companyId, keys);
        return {
            multiLevelApproval: Boolean(rows['expense.multi_level_approval']),
            approverChain: Array.isArray(rows['expense.approver_chain'])
                ? rows['expense.approver_chain']
                : JSON.parse(rows['expense.approver_chain'] || '[]'),
            fallbackRoles: Array.isArray(rows['expense.approval_fallback'])
                ? rows['expense.approval_fallback']
                : JSON.parse(rows['expense.approval_fallback'] || '[]'),
        };
    }
    async updateExpenseSetting(companyId, key, value) {
        const settingKey = `expense.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
};
exports.ExpensesSettingsService = ExpensesSettingsService;
exports.ExpensesSettingsService = ExpensesSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], ExpensesSettingsService);
//# sourceMappingURL=expense-settings.service.js.map