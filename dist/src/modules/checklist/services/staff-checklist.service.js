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
exports.StaffChecklistService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const checklist_schema_1 = require("../schema/checklist.schema");
const EXTRA_KEYS = [
    'onboarding_templates',
    'offboarding_process',
];
let StaffChecklistService = class StaffChecklistService {
    constructor(settings, db) {
        this.settings = settings;
        this.db = db;
    }
    async getExtraStatuses(companyId) {
        const rows = await this.db
            .select({ key: checklist_schema_1.checklistCompletion.checklistKey })
            .from(checklist_schema_1.checklistCompletion)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(checklist_schema_1.checklistCompletion.companyId, companyId), (0, drizzle_orm_1.inArray)(checklist_schema_1.checklistCompletion.checklistKey, EXTRA_KEYS)));
        const done = new Set(rows.map((r) => r.key));
        return {
            onboarding_templates: done.has('onboarding_templates') ? 'done' : 'todo',
            offboarding_process: done.has('offboarding_process') ? 'done' : 'todo',
        };
    }
    async markExtraDone(companyId, key, userId) {
        await this.db
            .insert(checklist_schema_1.checklistCompletion)
            .values({ companyId, checklistKey: key, completedBy: userId })
            .onConflictDoUpdate({
            target: [
                checklist_schema_1.checklistCompletion.companyId,
                checklist_schema_1.checklistCompletion.checklistKey,
            ],
            set: {
                completedBy: (0, drizzle_orm_1.sql) `EXCLUDED.completed_by`,
                completedAt: (0, drizzle_orm_1.sql) `now()`,
            },
        });
    }
    async getStaffChecklist(companyId) {
        const [company, employees, extras] = await Promise.all([
            this.settings.getOnboardingModule(companyId, 'company'),
            this.settings.getOnboardingModule(companyId, 'employees'),
            this.getExtraStatuses(companyId),
        ]);
        const tasks = {
            ...(company.tasks || {}),
            ...(employees.tasks || {}),
            ...extras,
        };
        const required = [
            ...(company.required || []),
            ...(employees.required || []),
        ];
        const completed = required.every((t) => tasks[t] === 'done');
        return {
            tasks,
            required,
            completed,
            disabledWhenComplete: (company.disabledWhenComplete ?? true) &&
                (employees.disabledWhenComplete ?? true),
        };
    }
};
exports.StaffChecklistService = StaffChecklistService;
exports.StaffChecklistService = StaffChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService, Object])
], StaffChecklistService);
//# sourceMappingURL=staff-checklist.service.js.map