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
exports.LeaveAccrualCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const leave_policy_service_1 = require("../policy/leave-policy.service");
const leave_balance_service_1 = require("./leave-balance.service");
const audit_service_1 = require("../../audit/audit.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../auth/schema");
const drizzle_orm_1 = require("drizzle-orm");
const company_service_1 = require("../../core/company/company.service");
let LeaveAccrualCronService = class LeaveAccrualCronService {
    constructor(leavePolicyService, leaveBalanceService, auditService, companyService, db) {
        this.leavePolicyService = leavePolicyService;
        this.leaveBalanceService = leaveBalanceService;
        this.auditService = auditService;
        this.companyService = companyService;
        this.db = db;
    }
    async handleMonthlyLeaveAccruals() {
        const currentYear = new Date().getFullYear();
        const policies = await this.leavePolicyService.findAllAccrualPolicies();
        for (const policy of policies) {
            if (policy.accrualFrequency !== 'monthly')
                continue;
            const employees = await this.companyService.findAllEmployeesInCompany(policy.companyId);
            if (!employees || employees.length === 0) {
                continue;
            }
            const superAdmin = await this.db
                .select()
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, policy.companyId))
                .limit(1)
                .execute();
            if (!superAdmin || superAdmin.length === 0) {
                continue;
            }
            const auditLogs = [];
            for (const employee of employees) {
                if (policy.onlyConfirmedEmployees && !employee.confirmed)
                    continue;
                const existingBalance = await this.leaveBalanceService.findBalanceByLeaveType(policy.companyId, employee.id, policy.leaveTypeId, currentYear);
                if (existingBalance) {
                    const entitlement = Number(existingBalance.entitlement);
                    const accrual = Number(policy.accrualAmount);
                    const newEntitlement = entitlement + accrual;
                    const newBalance = newEntitlement - Number(existingBalance.used);
                    await this.leaveBalanceService.update(existingBalance.id, {
                        entitlement: newEntitlement.toFixed(2),
                        balance: newBalance.toFixed(2),
                    });
                    auditLogs.push({
                        action: 'system accrual update',
                        entity: 'leave_balance',
                        entityId: existingBalance.id,
                        userId: superAdmin[0].id,
                        changes: {
                            entitlement: {
                                oldValue: existingBalance.entitlement,
                                newValue: newEntitlement,
                            },
                            balance: {
                                oldValue: existingBalance.balance,
                                newValue: newBalance,
                            },
                        },
                    });
                }
                else {
                    const initialEntitlement = Number(policy.accrualAmount);
                    const [newBalance] = await this.leaveBalanceService.create(policy.leaveTypeId, policy.companyId, employee.id, currentYear, initialEntitlement.toFixed(2), '0.00', initialEntitlement.toFixed(2));
                    auditLogs.push({
                        action: 'system accrual create',
                        entity: 'leave_balance',
                        entityId: newBalance.id,
                        userId: superAdmin[0].id,
                        changes: {
                            entitlement: {
                                oldValue: '0',
                                newValue: initialEntitlement,
                            },
                            balance: {
                                oldValue: '0',
                                newValue: initialEntitlement,
                            },
                        },
                    });
                }
            }
            if (auditLogs.length > 0) {
                await this.auditService.bulkLogActions(auditLogs);
            }
        }
    }
    async handleNonAccrualBalanceSetup() {
        const currentYear = new Date().getFullYear();
        const policies = await this.leavePolicyService.findAllNonAccrualPolicies();
        for (const policy of policies) {
            const employees = await this.companyService.findAllEmployeesInCompany(policy.companyId);
            if (!employees || employees.length === 0)
                continue;
            const superAdmin = await this.db
                .select()
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, policy.companyId))
                .limit(1)
                .execute();
            if (!superAdmin?.[0])
                continue;
            const auditLogs = [];
            for (const employee of employees) {
                if (policy.onlyConfirmedEmployees && !employee.confirmed)
                    continue;
                if (policy.genderEligibility &&
                    policy.genderEligibility !== 'any' &&
                    employee.gender !== policy.genderEligibility) {
                    continue;
                }
                const existingBalance = await this.leaveBalanceService.findBalanceByLeaveType(policy.companyId, employee.id, policy.leaveTypeId, currentYear);
                if (!existingBalance) {
                    const defaultEntitlement = Number(policy.maxBalance ?? 0);
                    const [newBalance] = await this.leaveBalanceService.create(policy.leaveTypeId, policy.companyId, employee.id, currentYear, defaultEntitlement.toFixed(2), '0.00', defaultEntitlement.toFixed(2));
                    auditLogs.push({
                        action: 'non-accrual balance create',
                        entity: 'leave_balance',
                        entityId: newBalance.id,
                        userId: superAdmin[0].id,
                        changes: {
                            entitlement: {
                                oldValue: '0',
                                newValue: defaultEntitlement,
                            },
                            balance: {
                                oldValue: '0',
                                newValue: defaultEntitlement,
                            },
                        },
                    });
                }
            }
            if (auditLogs.length > 0) {
                await this.auditService.bulkLogActions(auditLogs);
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
exports.LeaveAccrualCronService = LeaveAccrualCronService = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [leave_policy_service_1.LeavePolicyService,
        leave_balance_service_1.LeaveBalanceService,
        audit_service_1.AuditService,
        company_service_1.CompanyService, Object])
], LeaveAccrualCronService);
//# sourceMappingURL=leave-accrual.cron.js.map