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
var PayrollSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const date_fns_1 = require("date-fns");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const payroll_service_1 = require("./payroll.service");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const company_schema_1 = require("../../drizzle/schema/company.schema");
let PayrollSchedulerService = PayrollSchedulerService_1 = class PayrollSchedulerService {
    constructor(payrollService, db) {
        this.payrollService = payrollService;
        this.db = db;
        this.logger = new common_1.Logger(PayrollSchedulerService_1.name);
    }
    async handlePayrollRun() {
        const today = new Date();
        const groupsWithSchedules = await this.db
            .select({
            group_id: payroll_schema_1.payGroups.id,
            company_id: payroll_schema_1.payGroups.company_id,
            group_name: payroll_schema_1.payGroups.name,
            pay_schedule: company_schema_1.paySchedules.paySchedule,
        })
            .from(payroll_schema_1.payGroups)
            .innerJoin(company_schema_1.paySchedules, (0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.pay_schedule_id, company_schema_1.paySchedules.id))
            .execute();
        for (const { group_id, company_id, group_name, pay_schedule, } of groupsWithSchedules) {
            const adjustedPaySchedule = pay_schedule.map((date) => (0, date_fns_1.parseISO)(date).setHours(0, 0, 0, 0));
            const shouldRunToday = adjustedPaySchedule.some((payDate) => {
                const twoDaysBeforePayday = new Date(payDate);
                twoDaysBeforePayday.setDate(twoDaysBeforePayday.getDate() - 2);
                return (0, date_fns_1.isSameDay)(today, twoDaysBeforePayday);
            });
            if (!shouldRunToday)
                continue;
            this.logger.log(`Running payroll for group ${group_name} in company ${company_id}`);
            try {
                await this.payrollService.calculatePayrollForCompany(company_id, this.getPayrollMonth(today), group_id);
            }
            catch (err) {
                this.logger.error(`Failed payroll for group ${group_name}`, err.stack);
            }
        }
    }
    getPayrollMonth(today) {
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
};
exports.PayrollSchedulerService = PayrollSchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayrollSchedulerService.prototype, "handlePayrollRun", null);
exports.PayrollSchedulerService = PayrollSchedulerService = PayrollSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService, Object])
], PayrollSchedulerService);
//# sourceMappingURL=payroll-scheduler.service.js.map