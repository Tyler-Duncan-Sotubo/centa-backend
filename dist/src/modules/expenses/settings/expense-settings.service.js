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
var ExpensesSettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesSettingsService = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const cache_service_1 = require("../../../common/cache/cache.service");
let ExpensesSettingsService = ExpensesSettingsService_1 = class ExpensesSettingsService {
    constructor(companySettingsService, cache, logger) {
        this.companySettingsService = companySettingsService;
        this.cache = cache;
        this.logger = logger;
        this.logger.setContext(ExpensesSettingsService_1.name);
    }
    allKey(companyId) {
        return `company:${companyId}:expense:settings:all`;
    }
    oneKey(companyId) {
        return `company:${companyId}:expense:settings:normalized`;
    }
    safeJson(v, fallback) {
        if (Array.isArray(v))
            return v;
        if (typeof v !== 'string')
            return fallback;
        try {
            const parsed = JSON.parse(v);
            return Array.isArray(parsed) ? parsed : fallback;
        }
        catch {
            return fallback;
        }
    }
    async getAllExpenseSettings(companyId) {
        return this.cache.getOrSetCache(this.allKey(companyId), async () => {
            this.logger.debug({ companyId }, 'getAllExpenseSettings:miss');
            const settings = await this.companySettingsService.getAllSettings(companyId);
            const expenseSettings = {};
            for (const setting of settings) {
                if (setting.key.startsWith('expense.')) {
                    const strippedKey = setting.key.replace('expense.', '');
                    expenseSettings[strippedKey] = setting.value;
                }
            }
            return expenseSettings;
        });
    }
    async getExpenseSettings(companyId) {
        return this.cache.getOrSetCache(this.oneKey(companyId), async () => {
            this.logger.debug({ companyId }, 'getExpenseSettings:miss');
            const keys = [
                'expense.multi_level_approval',
                'expense.approver_chain',
                'expense.approval_fallback',
            ];
            const rows = await this.companySettingsService.fetchSettings(companyId, keys);
            const multiLevelApproval = Boolean(rows['expense.multi_level_approval']);
            const approverChain = this.safeJson(rows['expense.approver_chain'], []);
            const fallbackRoles = this.safeJson(rows['expense.approval_fallback'], []);
            return { multiLevelApproval, approverChain, fallbackRoles };
        });
    }
    async updateExpenseSetting(companyId, key, value) {
        const settingKey = `expense.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
        const jobs = [
            this.cache.del(this.allKey(companyId)),
            this.cache.del(this.oneKey(companyId)),
        ];
        await Promise.allSettled(jobs);
        this.logger.debug({ companyId, key, burst: ['all', 'normalized'] }, 'updateExpenseSetting:cache-busted');
    }
};
exports.ExpensesSettingsService = ExpensesSettingsService;
exports.ExpensesSettingsService = ExpensesSettingsService = ExpensesSettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService,
        cache_service_1.CacheService,
        nestjs_pino_1.PinoLogger])
], ExpensesSettingsService);
//# sourceMappingURL=expense-settings.service.js.map