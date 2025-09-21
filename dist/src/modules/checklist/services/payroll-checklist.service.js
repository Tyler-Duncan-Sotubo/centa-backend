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
exports.PayrollChecklistService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
const checklist_schema_1 = require("../schema/checklist.schema");
const PAYROLL_EXTRA_KEYS = [
    'general_settings',
    'pay_adjustments',
];
let PayrollChecklistService = class PayrollChecklistService {
    constructor(companySettings, db) {
        this.companySettings = companySettings;
        this.db = db;
    }
    async getExtraStatuses(companyId) {
        const rows = await this.db
            .select({ key: checklist_schema_1.checklistCompletion.checklistKey })
            .from(checklist_schema_1.checklistCompletion)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(checklist_schema_1.checklistCompletion.companyId, companyId), (0, drizzle_orm_1.inArray)(checklist_schema_1.checklistCompletion.checklistKey, PAYROLL_EXTRA_KEYS)));
        const done = new Set(rows.map((r) => r.key));
        return {
            general_settings: done.has('general_settings') ? 'done' : 'todo',
            pay_adjustments: done.has('pay_adjustments') ? 'done' : 'todo',
        };
    }
    async getPayrollChecklist(companyId) {
        const [payroll, extras] = await Promise.all([
            this.companySettings.getOnboardingModule(companyId, 'payroll'),
            this.getExtraStatuses(companyId),
        ]);
        const tasks = {
            ...(payroll.tasks || {}),
            ...extras,
        };
        const required = payroll.required || [];
        const completed = required.every((t) => tasks[t] === 'done');
        const order = [
            'pay_schedule',
            'pay_group',
            'salary_structure',
            'tax_details',
            'cost_center',
            'general_settings',
            'pay_adjustments',
        ];
        const orderedTasks = {};
        for (const key of order) {
            if (tasks[key] !== undefined) {
                orderedTasks[key] = tasks[key];
            }
        }
        return {
            tasks: orderedTasks,
            required,
            completed,
            disabledWhenComplete: payroll.disabledWhenComplete ?? true,
        };
    }
};
exports.PayrollChecklistService = PayrollChecklistService;
exports.PayrollChecklistService = PayrollChecklistService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService, Object])
], PayrollChecklistService);
//# sourceMappingURL=payroll-checklist.service.js.map