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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const onboarding_progress_schema_1 = require("../../drizzle/schema/onboarding_progress.schema");
let OnboardingService = class OnboardingService {
    constructor(db) {
        this.db = db;
        this.defaultTasks = [
            {
                taskKey: 'completeYourCompanyProfile',
                url: '/dashboard/settings/organization',
            },
            { taskKey: 'taxNumbersAdded', url: '/dashboard/settings/taxes' },
            {
                taskKey: 'payrollSettingsUpdated',
                url: '/dashboard/settings/payroll-settings',
            },
            {
                taskKey: 'payrollScheduleUpdated',
                url: '/dashboard/settings/pay-frequency',
            },
            { taskKey: 'addEmployees', url: '/dashboard/employees' },
        ];
    }
    async createOnboardingTasks(companyId) {
        const tasks = this.defaultTasks.map((task) => ({
            companyId,
            taskKey: task.taskKey,
            url: task.url,
        }));
        await this.db.insert(onboarding_progress_schema_1.onboardingProgress).values(tasks).execute();
    }
    async completeTask(companyId, taskKey) {
        await this.db
            .update(onboarding_progress_schema_1.onboardingProgress)
            .set({ completed: true })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(onboarding_progress_schema_1.onboardingProgress.companyId, companyId), (0, drizzle_orm_1.eq)(onboarding_progress_schema_1.onboardingProgress.taskKey, taskKey)))
            .execute();
    }
    async getOnboardingTasks(companyId) {
        return this.db
            .select()
            .from(onboarding_progress_schema_1.onboardingProgress)
            .where((0, drizzle_orm_1.eq)(onboarding_progress_schema_1.onboardingProgress.companyId, companyId))
            .orderBy(onboarding_progress_schema_1.onboardingProgress.taskKey)
            .execute();
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map