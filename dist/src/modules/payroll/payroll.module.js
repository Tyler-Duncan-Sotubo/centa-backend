"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollModule = void 0;
const common_1 = require("@nestjs/common");
const payroll_settings_service_1 = require("./settings/payroll-settings.service");
const run_module_1 = require("./run/run.module");
const pay_schedules_module_1 = require("./pay-schedules/pay-schedules.module");
const pay_groups_module_1 = require("./pay-groups/pay-groups.module");
const deductions_module_1 = require("./deductions/deductions.module");
const bonuses_module_1 = require("./bonuses/bonuses.module");
const allowances_module_1 = require("./allowances/allowances.module");
const report_module_1 = require("./report/report.module");
const payroll_settings_controller_1 = require("./settings/payroll-settings.controller");
const payslip_module_1 = require("./payslip/payslip.module");
const tax_module_1 = require("./tax/tax.module");
const payroll_processor_1 = require("./payroll.processor");
const pdf_service_1 = require("../../common/services/pdf.service");
const bullmq_1 = require("@nestjs/bullmq");
const aws_service_1 = require("../../common/aws/aws.service");
const payroll_overrides_module_1 = require("./payroll-overrides/payroll-overrides.module");
const payroll_adjustments_module_1 = require("./payroll-adjustments/payroll-adjustments.module");
const salary_advance_module_1 = require("./salary-advance/salary-advance.module");
const off_cycle_module_1 = require("./off-cycle/off-cycle.module");
let PayrollModule = class PayrollModule {
};
exports.PayrollModule = PayrollModule;
exports.PayrollModule = PayrollModule = __decorate([
    (0, common_1.Module)({
        providers: [payroll_settings_service_1.PayrollSettingsService, payroll_processor_1.PayrollProcessor, pdf_service_1.PdfService, aws_service_1.AwsService],
        exports: [
            payroll_settings_service_1.PayrollSettingsService,
            run_module_1.RunModule,
            pay_schedules_module_1.PaySchedulesModule,
            pay_groups_module_1.PayGroupsModule,
            deductions_module_1.DeductionsModule,
            bonuses_module_1.BonusesModule,
            allowances_module_1.AllowancesModule,
            report_module_1.ReportModule,
            payslip_module_1.PayslipModule,
            tax_module_1.TaxModule,
            payroll_processor_1.PayrollProcessor,
            pdf_service_1.PdfService,
            aws_service_1.AwsService,
        ],
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'payrollQueue',
            }),
            run_module_1.RunModule,
            pay_schedules_module_1.PaySchedulesModule,
            pay_groups_module_1.PayGroupsModule,
            deductions_module_1.DeductionsModule,
            bonuses_module_1.BonusesModule,
            allowances_module_1.AllowancesModule,
            report_module_1.ReportModule,
            payslip_module_1.PayslipModule,
            tax_module_1.TaxModule,
            payroll_overrides_module_1.PayrollOverridesModule,
            payroll_adjustments_module_1.PayrollAdjustmentsModule,
            salary_advance_module_1.SalaryAdvanceModule,
            off_cycle_module_1.OffCycleModule,
        ],
        controllers: [payroll_settings_controller_1.PayrollSettingsController],
    })
], PayrollModule);
//# sourceMappingURL=payroll.module.js.map