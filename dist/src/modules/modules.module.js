"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("./audit/audit.module");
const core_module_1 = require("./core/core.module");
const auth_module_1 = require("./auth/auth.module");
const notification_module_1 = require("./notification/notification.module");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const leave_module_1 = require("./leave/leave.module");
const company_settings_module_1 = require("../company-settings/company-settings.module");
const holidays_module_1 = require("./leave/holidays/holidays.module");
const cache_module_1 = require("../common/cache/cache.module");
const time_module_1 = require("./time/time.module");
const payroll_module_1 = require("./payroll/payroll.module");
const benefits_module_1 = require("./benefits/benefits.module");
const expenses_module_1 = require("./expenses/expenses.module");
const assets_module_1 = require("./assets/assets.module");
const announcement_module_1 = require("./announcement/announcement.module");
const export_clean_service_1 = require("../common/services/export-clean.service");
const recruitment_module_1 = require("./recruitment/recruitment.module");
const integrations_module_1 = require("./integrations/integrations.module");
const seeder_module_1 = require("./seed/seeder.module");
let ModulesModule = class ModulesModule {
};
exports.ModulesModule = ModulesModule;
exports.ModulesModule = ModulesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [export_clean_service_1.ExportCleanupService],
        imports: [
            core_module_1.CoreModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            notification_module_1.NotificationModule,
            drizzle_module_1.DrizzleModule,
            leave_module_1.LeaveModule,
            company_settings_module_1.CompanySettingsModule,
            holidays_module_1.HolidaysModule,
            cache_module_1.CacheModule,
            time_module_1.TimeModule,
            payroll_module_1.PayrollModule,
            benefits_module_1.BenefitsModule,
            expenses_module_1.ExpensesModule,
            assets_module_1.AssetsModule,
            announcement_module_1.AnnouncementModule,
            recruitment_module_1.RecruitmentModule,
            integrations_module_1.IntegrationsModule,
            seeder_module_1.SeederModule,
        ],
        exports: [
            core_module_1.CoreModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            notification_module_1.NotificationModule,
            drizzle_module_1.DrizzleModule,
            leave_module_1.LeaveModule,
            company_settings_module_1.CompanySettingsModule,
            holidays_module_1.HolidaysModule,
            cache_module_1.CacheModule,
            time_module_1.TimeModule,
            payroll_module_1.PayrollModule,
            benefits_module_1.BenefitsModule,
            expenses_module_1.ExpensesModule,
            assets_module_1.AssetsModule,
            announcement_module_1.AnnouncementModule,
            recruitment_module_1.RecruitmentModule,
            integrations_module_1.IntegrationsModule,
            seeder_module_1.SeederModule,
        ],
    })
], ModulesModule);
//# sourceMappingURL=modules.module.js.map