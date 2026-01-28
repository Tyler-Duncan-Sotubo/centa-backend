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
exports.CompanySettingsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const index_schema_1 = require("./schema/index.schema");
const drizzle_orm_1 = require("drizzle-orm");
const attendance_1 = require("./settings/attendance");
const leave_1 = require("./settings/leave");
const payroll_1 = require("./settings/payroll");
const expense_1 = require("./settings/expense");
const performance_1 = require("./settings/performance");
const onboarding_1 = require("./settings/onboarding");
const constants_1 = require("./constants/constants");
const schema_1 = require("../drizzle/schema");
let CompanySettingsService = class CompanySettingsService {
    constructor(db) {
        this.db = db;
        this.settings = [
            ...attendance_1.attendance,
            ...leave_1.leave,
            ...payroll_1.payroll,
            ...expense_1.expenses,
            ...performance_1.performance,
            ...onboarding_1.onboarding,
            { key: 'default_currency', value: 'USD' },
            { key: 'default_timezone', value: 'UTC' },
            { key: 'default_language', value: 'en' },
            { key: 'default_manager_id', value: 'UUID-of-super-admin-or-lead' },
            { key: 'two_factor_auth', value: true },
        ];
    }
    tagCompany(companyId) {
        return [`company:${companyId}:settings`];
    }
    tagGroup(companyId, group) {
        return [`company:${companyId}:settings:group:${group}`];
    }
    async getSetting(companyId, key) {
        const setting = await this.db
            .select()
            .from(index_schema_1.companySettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.eq)(index_schema_1.companySettings.key, key)));
        return setting[0] ? setting[0].value : null;
    }
    async getAllSettings(companyId) {
        return this.db
            .select()
            .from(index_schema_1.companySettings)
            .where((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId))
            .execute();
    }
    async getSettingsOrDefaults(companyId, key, defaultValue) {
        const value = await this.getSetting(companyId, key);
        return value === null || value === undefined ? defaultValue : value;
    }
    async setSetting(companyId, key, value) {
        const existing = await this.db
            .select({ id: index_schema_1.companySettings.id })
            .from(index_schema_1.companySettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.eq)(index_schema_1.companySettings.key, key)))
            .execute();
        const settingExists = existing.length > 0;
        if (settingExists) {
            await this.db
                .update(index_schema_1.companySettings)
                .set({ value })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.eq)(index_schema_1.companySettings.key, key)));
        }
        else {
            await this.db.insert(index_schema_1.companySettings).values({
                companyId,
                key,
                value,
            });
        }
    }
    async getSettingsByGroup(companyId, prefix) {
        const rows = await this.db
            .select()
            .from(index_schema_1.companySettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.like)(index_schema_1.companySettings.key, `${prefix}.%`)));
        const settings = [];
        for (const row of rows) {
            settings.push({
                key: row.key.replace(`${prefix}.`, ''),
                value: row.value,
            });
        }
        return settings;
    }
    async setSettings(companyId) {
        if (!this.settings.length)
            return;
        await this.db
            .insert(index_schema_1.companySettings)
            .values(this.settings.map((setting) => ({
            companyId,
            key: setting.key,
            value: setting.value,
        })))
            .onConflictDoUpdate({
            target: [index_schema_1.companySettings.companyId, index_schema_1.companySettings.key],
            set: { value: (0, drizzle_orm_1.sql) `EXCLUDED.value` },
        });
    }
    async deleteSetting(companyId, key) {
        await this.db
            .delete(index_schema_1.companySettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.eq)(index_schema_1.companySettings.key, key)));
    }
    async getDefaultManager(companyId) {
        const keys = ['default_manager_id'];
        const map = await this.fetchSettings(companyId, keys);
        return {
            defaultManager: map['default_manager_id'] || '',
        };
    }
    async getPayrollConfig(companyId) {
        const keys = [
            'payroll.apply_paye',
            'payroll.apply_nhf',
            'payroll.apply_pension',
            'payroll.apply_nhis',
            'payroll.apply_nsitf',
            'payroll.basic_percent',
            'payroll.housing_percent',
            'payroll.transport_percent',
            'payroll.allowance_others',
        ];
        const map = await this.fetchSettings(companyId, keys);
        return {
            applyPaye: Boolean(map['payroll.apply_paye']),
            applyNhf: Boolean(map['payroll.apply_nhf']),
            applyPension: Boolean(map['payroll.apply_pension']),
            applyNhis: Boolean(map['payroll.apply_nhis']),
            applyNsitf: Boolean(map['payroll.apply_nsitf']),
        };
    }
    async getAllowanceConfig(companyId) {
        const keys = [
            'payroll.basic_percent',
            'payroll.housing_percent',
            'payroll.transport_percent',
            'payroll.allowance_others',
        ];
        const map = await this.fetchSettings(companyId, keys);
        return {
            basicPercent: Number(map['payroll.basic_percent'] ?? 0),
            housingPercent: Number(map['payroll.housing_percent'] ?? 0),
            transportPercent: Number(map['payroll.transport_percent'] ?? 0),
            allowanceOthers: map['payroll.allowance_others'] || [],
        };
    }
    async getApprovalAndProrationSettings(companyId) {
        const keys = [
            'payroll.multi_level_approval',
            'payroll.approver_chain',
            'payroll.approval_fallback',
            'payroll.approver',
            'payroll.enable_proration',
        ];
        const map = await this.fetchSettings(companyId, keys);
        return {
            multiLevelApproval: Boolean(map['payroll.multi_level_approval']),
            approverChain: map['payroll.approver_chain'] || [],
            approvalFallback: map['payroll.approval_fallback'] || [],
            approver: map['payroll.approver'] ?? null,
            enableProration: Boolean(map['payroll.enable_proration']),
        };
    }
    async getThirteenthMonthSettings(companyId) {
        const keys = [
            'payroll.enable_13th_month',
            'payroll.13th_month_payment_date',
            'payroll.13th_month_payment_amount',
            'payroll.13th_month_payment_type',
            'payroll.13th_month_payment_percentage',
        ];
        const map = await this.fetchSettings(companyId, keys);
        return {
            enable13thMonth: Boolean(map['payroll.enable_13th_month']),
            paymentDate: map['payroll.13th_month_payment_date'],
            paymentAmount: Number(map['payroll.13th_month_payment_amount'] ?? 0),
            paymentType: map['payroll.13th_month_payment_type'] ?? 'fixed',
            paymentPercentage: Number(map['payroll.13th_month_payment_percentage'] ?? 0),
        };
    }
    async getLoanSettings(companyId) {
        const keys = [
            'payroll.use_loan',
            'payroll.loan_max_percent',
            'payroll.loan_min_amount',
            'payroll.loan_max_amount',
        ];
        const map = await this.fetchSettings(companyId, keys);
        return {
            useLoan: Boolean(map['payroll.use_loan']),
            maxPercentOfSalary: Number(map['payroll.loan_max_percent'] ?? 1),
            minAmount: Number(map['payroll.loan_min_amount'] ?? 0),
            maxAmount: Number(map['payroll.loan_max_amount'] ?? Infinity),
        };
    }
    async fetchSettings(companyId, keys) {
        const rows = await this.db
            .select({ key: index_schema_1.companySettings.key, value: index_schema_1.companySettings.value })
            .from(index_schema_1.companySettings)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.inArray)(index_schema_1.companySettings.key, keys)))
            .execute();
        return rows.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
        }, {});
    }
    async getTwoFactorAuthSetting(companyId) {
        const map = await this.fetchSettings(companyId, ['two_factor_auth']);
        return { twoFactorAuth: Boolean(map['two_factor_auth']) };
    }
    async getOnboardingSettings(companyId) {
        const keys = [
            'onboarding_pay_frequency',
            'onboarding_pay_group',
            'onboarding_tax_details',
            'onboarding_company_locations',
            'onboarding_departments',
            'onboarding_job_roles',
            'onboarding_cost_center',
            'onboarding_upload_employees',
        ];
        const map = await this.fetchSettings(companyId, keys);
        return {
            payFrequency: Boolean(map['onboarding_pay_frequency']),
            payGroup: Boolean(map['onboarding_pay_group']),
            taxDetails: Boolean(map['onboarding_tax_details']),
            companyLocations: Boolean(map['onboarding_company_locations']),
            departments: Boolean(map['onboarding_departments']),
            jobRoles: Boolean(map['onboarding_job_roles']),
            costCenter: Boolean(map['onboarding_cost_center']),
            uploadEmployees: Boolean(map['onboarding_upload_employees']),
        };
    }
    async getOnboardingModule(companyId, module) {
        const legacy = await this.getOnboardingLegacy(companyId);
        const json = await this.getSetting(companyId, (0, constants_1.MODULE_SETTING_KEY)(module));
        const tasks = { ...(json?.tasks ?? {}) };
        for (const t of constants_1.ALLOWED_TASKS[module]) {
            const oldKey = legacy.mapKey[module]?.[t];
            const legacyDone = oldKey ? Boolean(legacy.values[oldKey]) : false;
            if (legacyDone)
                tasks[t] = 'done';
            if (!tasks[t])
                tasks[t] = 'todo';
        }
        const completed = constants_1.REQUIRED[module].every((t) => tasks[t] === 'done');
        return {
            ...(json ?? {}),
            tasks,
            required: constants_1.REQUIRED[module],
            completed,
            disabledWhenComplete: json?.disabledWhenComplete ?? true,
        };
    }
    async getOnboardingAll(companyId) {
        const [payroll, company, employees] = await Promise.all([
            this.getOnboardingModule(companyId, 'payroll'),
            this.getOnboardingModule(companyId, 'company'),
            this.getOnboardingModule(companyId, 'employees'),
        ]);
        return { payroll, company, employees };
    }
    async getOnboardingLegacy(companyId) {
        const keys = [
            'onboarding_pay_frequency',
            'onboarding_pay_group',
            'onboarding_tax_details',
            'onboarding_company_locations',
            'onboarding_departments',
            'onboarding_job_roles',
            'onboarding_cost_center',
            'onboarding_upload_employees',
        ];
        const values = await this.fetchSettings(companyId, keys);
        const mapKey = {
            payroll: {
                pay_schedule: 'onboarding_pay_frequency',
                pay_group: 'onboarding_pay_group',
                salary_structure: 'onboarding_salary_structure',
                tax_details: 'onboarding_tax_details',
                cost_center: 'onboarding_cost_center',
            },
            company: {
                company_locations: 'onboarding_company_locations',
                departments: 'onboarding_departments',
                job_roles: 'onboarding_job_roles',
            },
            employees: {
                upload_employees: 'onboarding_upload_employees',
            },
        };
        return { values, mapKey };
    }
    async setOnboardingTask(companyId, module, taskKey, status) {
        if (!constants_1.ALLOWED_TASKS[module].includes(taskKey)) {
            throw new Error(`Invalid task "${taskKey}" for module "${module}"`);
        }
        if (!['todo', 'inProgress', 'done', 'skipped', 'blocked'].includes(status)) {
            throw new Error(`Invalid status "${status}"`);
        }
        const mod = await this.getOnboardingModule(companyId, module);
        const next = {
            tasks: { ...(mod.tasks || {}), [taskKey]: status },
            required: mod.required || constants_1.REQUIRED[module],
            disabledWhenComplete: mod.disabledWhenComplete ?? true,
        };
        const completed = next.required.every((t) => next.tasks[t] === 'done');
        await this.setSetting(companyId, (0, constants_1.MODULE_SETTING_KEY)(module), {
            ...next,
            completed,
        });
        const legacy = await this.getOnboardingLegacy(companyId);
        const legacyKey = legacy.mapKey[module]?.[taskKey];
        if (legacyKey) {
            await this.setSetting(companyId, legacyKey, status === 'done');
        }
    }
    async migrateOnboardingToModules(companyId) {
        const existing = await this.fetchSettings(companyId, [
            (0, constants_1.MODULE_SETTING_KEY)('payroll'),
            (0, constants_1.MODULE_SETTING_KEY)('company'),
            (0, constants_1.MODULE_SETTING_KEY)('employees'),
        ]);
        const legacy = await this.getOnboardingLegacy(companyId);
        const build = (module) => {
            if (existing[(0, constants_1.MODULE_SETTING_KEY)(module)]) {
                return existing[(0, constants_1.MODULE_SETTING_KEY)(module)];
            }
            const tasks = {};
            for (const t of constants_1.ALLOWED_TASKS[module]) {
                const oldKey = legacy.mapKey[module]?.[t];
                const oldVal = oldKey ? Boolean(legacy.values[oldKey]) : false;
                tasks[t] = oldVal ? 'done' : 'todo';
            }
            const required = constants_1.REQUIRED[module];
            const completed = required.every((t) => tasks[t] === 'done');
            return { tasks, required, completed, disabledWhenComplete: true };
        };
        const payroll = build('payroll');
        const company = build('company');
        const employees = build('employees');
        await this.db.transaction(async (tx) => {
            for (const [k, v] of [
                [(0, constants_1.MODULE_SETTING_KEY)('payroll'), payroll],
                [(0, constants_1.MODULE_SETTING_KEY)('company'), company],
                [(0, constants_1.MODULE_SETTING_KEY)('employees'), employees],
            ]) {
                await tx
                    .insert(index_schema_1.companySettings)
                    .values({ companyId, key: k, value: v })
                    .onConflictDoUpdate({
                    target: [index_schema_1.companySettings.companyId, index_schema_1.companySettings.key],
                    set: { value: (0, drizzle_orm_1.sql) `EXCLUDED.value` },
                });
            }
        });
    }
    async backfillOnboardingModulesForAllCompanies() {
        const allCompanies = await this.db.select().from(schema_1.companies).execute();
        for (const { id: companyId } of allCompanies) {
            const legacyCount = await this.db
                .select({ c: (0, drizzle_orm_1.sql) `COUNT(*)` })
                .from(index_schema_1.companySettings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(index_schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.sql) `${index_schema_1.companySettings.key} LIKE 'onboarding\\_%'`))
                .then((r) => r[0]?.c ?? 0);
            const existing = await this.fetchSettings(companyId, [
                (0, constants_1.MODULE_SETTING_KEY)('payroll'),
                (0, constants_1.MODULE_SETTING_KEY)('company'),
                (0, constants_1.MODULE_SETTING_KEY)('employees'),
            ]);
            const hasNew = Boolean(existing[(0, constants_1.MODULE_SETTING_KEY)('payroll')]) &&
                Boolean(existing[(0, constants_1.MODULE_SETTING_KEY)('company')]) &&
                Boolean(existing[(0, constants_1.MODULE_SETTING_KEY)('employees')]);
            if (hasNew)
                continue;
            if (legacyCount > 0) {
                await this.migrateOnboardingToModules(companyId);
            }
            else {
                await this.setSettings(companyId);
            }
        }
    }
    async getOnboardingVisibility(companyId) {
        const { payroll, company, employees } = await this.getOnboardingAll(companyId);
        return {
            staff: Boolean(company.completed) && Boolean(employees.completed),
            payroll: Boolean(payroll.completed),
        };
    }
};
exports.CompanySettingsService = CompanySettingsService;
exports.CompanySettingsService = CompanySettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], CompanySettingsService);
//# sourceMappingURL=company-settings.service.js.map