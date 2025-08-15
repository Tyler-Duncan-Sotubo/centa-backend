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
var LeaveAccrualCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveAccrualCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const drizzle_orm_1 = require("drizzle-orm");
const leave_policy_service_1 = require("../policy/leave-policy.service");
const leave_balance_service_1 = require("./leave-balance.service");
const audit_service_1 = require("../../audit/audit.service");
const company_service_1 = require("../../core/company/company.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../auth/schema");
let LeaveAccrualCronService = LeaveAccrualCronService_1 = class LeaveAccrualCronService {
    constructor(leavePolicyService, leaveBalanceService, auditService, companyService, db) {
        this.leavePolicyService = leavePolicyService;
        this.leaveBalanceService = leaveBalanceService;
        this.auditService = auditService;
        this.companyService = companyService;
        this.db = db;
        this.logger = new common_1.Logger(LeaveAccrualCronService_1.name);
    }
    async handleMonthlyLeaveAccruals() {
        const currentYear = new Date().getFullYear();
        const companies = await this.companyService.getAllCompanies();
        if (!companies?.length) {
            this.logger.log('No companies found; skipping monthly accruals.');
            return;
        }
        for (const company of companies) {
            const companyId = company.id;
            try {
                const policies = await this.leavePolicyService.findAllAccrualPolicies(companyId);
                const monthlyPolicies = policies.filter((p) => p.accrualFrequency === 'monthly');
                if (!monthlyPolicies.length) {
                    this.logger.log(`No monthly accrual policies for company ${companyId}`);
                    continue;
                }
                const employees = await this.companyService.findAllEmployeesInCompany(companyId);
                if (!employees?.length) {
                    this.logger.log(`No employees for company ${companyId}`);
                    continue;
                }
                const [actor] = await this.db
                    .select({ id: schema_1.users.id })
                    .from(schema_1.users)
                    .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId))
                    .limit(1)
                    .execute();
                const actorId = actor?.id ?? 'system';
                const auditLogs = [];
                for (const policy of monthlyPolicies) {
                    for (const employee of employees) {
                        if (policy.onlyConfirmedEmployees && !employee.confirmed)
                            continue;
                        const existing = await this.leaveBalanceService.findBalanceByLeaveType(companyId, employee.id, policy.leaveTypeId, currentYear);
                        if (existing) {
                            const entitlementNum = Number(existing.entitlement) || 0;
                            const accrualNum = Number(policy.accrualAmount) || 0;
                            const newEntitlement = entitlementNum + accrualNum;
                            const usedNum = Number(existing.used) || 0;
                            const newBalance = newEntitlement - usedNum;
                            await this.leaveBalanceService.update(existing.id, {
                                entitlement: newEntitlement.toFixed(2),
                                balance: newBalance.toFixed(2),
                            });
                            auditLogs.push({
                                action: 'system accrual update',
                                entity: 'leave_balance',
                                entityId: existing.id,
                                userId: actorId,
                                changes: {
                                    entitlement: {
                                        oldValue: existing.entitlement,
                                        newValue: newEntitlement,
                                    },
                                    balance: { oldValue: existing.balance, newValue: newBalance },
                                },
                            });
                        }
                        else {
                            const initial = Number(policy.accrualAmount) || 0;
                            const [created] = await this.leaveBalanceService.create(policy.leaveTypeId, companyId, employee.id, currentYear, initial.toFixed(2), '0.00', initial.toFixed(2));
                            auditLogs.push({
                                action: 'system accrual create',
                                entity: 'leave_balance',
                                entityId: created.id,
                                userId: actorId,
                                changes: {
                                    entitlement: { oldValue: '0', newValue: initial },
                                    balance: { oldValue: '0', newValue: initial },
                                },
                            });
                        }
                    }
                }
                if (auditLogs.length) {
                    await this.auditService.bulkLogActions(auditLogs);
                }
                this.logger.log(`Monthly accruals completed for company ${companyId}`);
            }
            catch (err) {
                this.logger.error(`Accruals failed for company ${companyId}: ${err.message}`, err.stack);
            }
        }
    }
    async handleNonAccrualBalanceSetup() {
        const currentYear = new Date().getFullYear();
        const companies = await this.companyService.getAllCompanies();
        if (!companies?.length) {
            this.logger.log('No companies found; skipping non-accrual setup.');
            return;
        }
        for (const company of companies) {
            const companyId = company.id;
            try {
                const policies = await this.leavePolicyService.findAllNonAccrualPolicies(companyId);
                if (!policies?.length) {
                    this.logger.log(`No non-accrual policies for company ${companyId}`);
                    continue;
                }
                const employees = await this.companyService.findAllEmployeesInCompany(companyId);
                if (!employees?.length) {
                    this.logger.log(`No employees for company ${companyId}`);
                    continue;
                }
                const [actor] = await this.db
                    .select({ id: schema_1.users.id })
                    .from(schema_1.users)
                    .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId))
                    .limit(1)
                    .execute();
                const actorId = actor?.id ?? 'system';
                const auditLogs = [];
                for (const policy of policies) {
                    for (const employee of employees) {
                        if (policy.onlyConfirmedEmployees && !employee.confirmed)
                            continue;
                        if (policy.genderEligibility &&
                            policy.genderEligibility !== 'any' &&
                            employee.gender !== policy.genderEligibility) {
                            continue;
                        }
                        const existing = await this.leaveBalanceService.findBalanceByLeaveType(companyId, employee.id, policy.leaveTypeId, currentYear);
                        if (!existing) {
                            const defaultEntitlement = Number(policy.maxBalance ?? 0);
                            const [created] = await this.leaveBalanceService.create(policy.leaveTypeId, companyId, employee.id, currentYear, defaultEntitlement.toFixed(2), '0.00', defaultEntitlement.toFixed(2));
                            auditLogs.push({
                                action: 'non-accrual balance create',
                                entity: 'leave_balance',
                                entityId: created.id,
                                userId: actorId,
                                changes: {
                                    entitlement: { oldValue: '0', newValue: defaultEntitlement },
                                    balance: { oldValue: '0', newValue: defaultEntitlement },
                                },
                            });
                        }
                    }
                }
                if (auditLogs.length) {
                    await this.auditService.bulkLogActions(auditLogs);
                }
                this.logger.log(`Non-accrual balance setup completed for company ${companyId}`);
            }
            catch (err) {
                this.logger.error(`Non-accrual setup failed for company ${companyId}: ${err.message}`, err.stack);
            }
        }
    }
};
exports.LeaveAccrualCronService = LeaveAccrualCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveAccrualCronService.prototype, "handleMonthlyLeaveAccruals", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_WEEK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveAccrualCronService.prototype, "handleNonAccrualBalanceSetup", null);
exports.LeaveAccrualCronService = LeaveAccrualCronService = LeaveAccrualCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [leave_policy_service_1.LeavePolicyService,
        leave_balance_service_1.LeaveBalanceService,
        audit_service_1.AuditService,
        company_service_1.CompanyService, Object])
], LeaveAccrualCronService);
//# sourceMappingURL=leave-accrual.cron.js.map