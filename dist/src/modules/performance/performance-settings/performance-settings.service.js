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
exports.PerformanceSettingsService = void 0;
const common_1 = require("@nestjs/common");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let PerformanceSettingsService = class PerformanceSettingsService {
    constructor(companySettingsService) {
        this.companySettingsService = companySettingsService;
    }
    async getAllPerformanceSettings(companyId) {
        const settings = await this.companySettingsService.getAllSettings(companyId);
        const performanceSettings = {};
        for (const setting of settings) {
            if (setting.key.startsWith('performance.')) {
                const strippedKey = setting.key.replace('performance.', '');
                performanceSettings[strippedKey] = setting.value;
            }
        }
        return performanceSettings;
    }
    async getPerformanceSettings(companyId) {
        const keys = [
            'performance.auto_create_cycles',
            'performance.review_frequency',
            'performance.enable_self_review',
            'performance.require_review_rating',
            'performance.review_score_scale',
            'performance.notify_review_overdue',
            'performance.notify_review_upcoming',
            'performance.review_reminder_offset_days',
            'performance.notify_goal_updated_by_employee',
            'performance.goal_reminder_frequency',
            'performance.auto_create_appraisals',
            'performance.appraisals_frequency',
            'performance.appraisal_include_new_employees',
            'performance.default_manager_assignment',
            'performance.allow_manager_override',
            'performance.auto_finalize_deadline_days',
        ];
        const rows = await this.companySettingsService.fetchSettings(companyId, keys);
        const asArray = (v, fallback) => {
            if (Array.isArray(v))
                return v;
            if (typeof v === 'string' && v.trim()) {
                try {
                    const parsed = JSON.parse(v);
                    return Array.isArray(parsed) ? parsed : fallback;
                }
                catch {
                    return fallback;
                }
            }
            return fallback;
        };
        return {
            autoCreateCycles: Boolean(rows['performance.auto_create_cycles']),
            reviewFrequency: rows['performance.review_frequency'] ?? 'annual',
            enableSelfReview: Boolean(rows['performance.enable_self_review']),
            requireReviewRating: Boolean(rows['performance.require_review_rating']),
            reviewScoreScale: Number(rows['performance.review_score_scale']) || 100,
            notifyReviewOverdue: asArray(rows['performance.notify_review_overdue'], [
                'employee',
                'manager',
            ]),
            notifyReviewUpcoming: asArray(rows['performance.notify_review_upcoming'], ['employee']),
            reviewReminderOffsetDays: Number(rows['performance.review_reminder_offset_days']) || 3,
            notifyGoalUpdatedByEmployee: asArray(rows['performance.notify_goal_updated_by_employee'], ['manager']),
            goalReminderFrequency: rows['performance.goal_reminder_frequency'] ?? 'weekly',
            autoCreateAppraisals: Boolean(rows['performance.auto_create_appraisals']),
            appraisalFrequency: rows['performance.appraisals_frequency'] ?? 'annual',
            appraisalIncludeNewEmployees: Boolean(rows['performance.appraisal_include_new_employees']),
            defaultManagerAssignment: Boolean(rows['performance.default_manager_assignment']),
            allowManagerOverride: Boolean(rows['performance.allow_manager_override']),
            autoFinalizeDeadlineDays: Number(rows['performance.auto_finalize_deadline_days']) || 5,
        };
    }
    async updatePerformanceSetting(companyId, key, value) {
        const settingKey = `performance.${key}`;
        await this.companySettingsService.setSetting(companyId, settingKey, value);
    }
};
exports.PerformanceSettingsService = PerformanceSettingsService;
exports.PerformanceSettingsService = PerformanceSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], PerformanceSettingsService);
//# sourceMappingURL=performance-settings.service.js.map