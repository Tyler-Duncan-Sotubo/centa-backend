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
const payroll_service_1 = require("./services/payroll.service");
const payroll_controller_1 = require("./payroll.controller");
const loan_controller_1 = require("./loan.controller");
const bullmq_1 = require("@nestjs/bullmq");
const payroll_processor_1 = require("./payroll.processor");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const payslip_service_1 = require("./services/payslip.service");
const deduction_service_1 = require("./services/deduction.service");
const cache_module_1 = require("../config/cache/cache.module");
const cache_service_1 = require("../config/cache/cache.service");
const aws_service_1 = require("../config/aws/aws.service");
const tax_service_1 = require("./services/tax.service");
const pdf_service_1 = require("./services/pdf.service");
const loan_service_1 = require("./services/loan.service");
const pusher_service_1 = require("../notification/services/pusher.service");
const onboarding_service_1 = require("../organization/services/onboarding.service");
const pay_group_service_1 = require("./services/pay-group.service");
const audit_service_1 = require("../audit/audit.service");
const primary_guard_1 = require("../auth/guards/primary.guard");
const jwt_1 = require("@nestjs/jwt");
const schedule_1 = require("@nestjs/schedule");
const payroll_scheduler_service_1 = require("./services/payroll-scheduler.service");
const push_notification_service_1 = require("../notification/services/push-notification.service");
let PayrollModule = class PayrollModule {
};
exports.PayrollModule = PayrollModule;
exports.PayrollModule = PayrollModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(),
            cache_module_1.CacheModule,
            drizzle_module_1.DrizzleModule,
            bullmq_1.BullModule.registerQueue({
                name: 'payrollQueue',
            }),
        ],
        controllers: [payroll_controller_1.PayrollController, loan_controller_1.LoanController],
        providers: [
            payroll_service_1.PayrollService,
            payroll_processor_1.PayrollProcessor,
            payslip_service_1.PayslipService,
            deduction_service_1.DeductionService,
            cache_service_1.CacheService,
            aws_service_1.AwsService,
            tax_service_1.TaxService,
            pdf_service_1.PdfService,
            loan_service_1.LoanService,
            pusher_service_1.PusherService,
            onboarding_service_1.OnboardingService,
            pay_group_service_1.PayGroupService,
            audit_service_1.AuditService,
            primary_guard_1.PrimaryGuard,
            jwt_1.JwtService,
            payroll_scheduler_service_1.PayrollSchedulerService,
            push_notification_service_1.PushNotificationService,
        ],
    })
], PayrollModule);
//# sourceMappingURL=payroll.module.js.map