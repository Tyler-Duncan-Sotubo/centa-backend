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
exports.SalaryAdvanceService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const salary_advance_schema_1 = require("./schema/salary-advance.schema");
const audit_service_1 = require("../../audit/audit.service");
const payroll_settings_service_1 = require("../settings/payroll-settings.service");
const pusher_service_1 = require("../../notification/services/pusher.service");
const compensation_schema_1 = require("../../core/employees/schema/compensation.schema");
const decimal_js_1 = require("decimal.js");
const loan_sequences_schema_1 = require("./schema/loan_sequences.schema");
const push_notification_service_1 = require("../../notification/services/push-notification.service");
let SalaryAdvanceService = class SalaryAdvanceService {
    constructor(db, cache, auditService, payrollSettingsService, pusher, push) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.payrollSettingsService = payrollSettingsService;
        this.pusher = pusher;
        this.push = push;
    }
    async createLoanNumber(companyId) {
        const [seqRow] = await this.db
            .select({ next: loan_sequences_schema_1.loanSequences.nextNumber })
            .from(loan_sequences_schema_1.loanSequences)
            .where((0, drizzle_orm_1.eq)(loan_sequences_schema_1.loanSequences.companyId, companyId))
            .execute();
        let seq = 1;
        if (!seqRow) {
            await this.db
                .insert(loan_sequences_schema_1.loanSequences)
                .values({ companyId, nextNumber: 2 })
                .execute();
        }
        else {
            seq = seqRow.next;
            await this.db
                .update(loan_sequences_schema_1.loanSequences)
                .set({ nextNumber: seq + 1 })
                .where((0, drizzle_orm_1.eq)(loan_sequences_schema_1.loanSequences.companyId, companyId))
                .execute();
        }
        return `LOAN-${String(seq).padStart(3, '0')}`;
    }
    async getEmployeeCompanyId(employeeId) {
        const [row] = await this.db
            .select({ companyId: schema_1.employees.companyId })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employeeId))
            .execute();
        if (!row)
            throw new common_1.BadRequestException('Employee not found');
        return row.companyId;
    }
    async getEmployee(employee_id) {
        const companyId = await this.getEmployeeCompanyId(employee_id);
        return this.cache.getOrSetVersioned(companyId, ['employees', 'byId', employee_id], async () => {
            const [employee] = await this.db
                .select({
                id: schema_1.employees.id,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                companyId: schema_1.employees.companyId,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, employee_id))
                .execute();
            if (!employee)
                throw new common_1.BadRequestException('Employee not found');
            return employee;
        }, {
            tags: [
                'employees',
                `company:${companyId}:employees`,
                `employee:${employee_id}`,
            ],
        });
    }
    async getUnpaidAdvanceDeductions(employee_id) {
        const companyId = await this.getEmployeeCompanyId(employee_id);
        return this.cache.getOrSetVersioned(companyId, ['loans', 'unpaidDeduction', employee_id], async () => {
            return await this.db
                .select({
                loanId: salary_advance_schema_1.salaryAdvance.id,
                monthlyDeduction: salary_advance_schema_1.salaryAdvance.preferredMonthlyPayment,
            })
                .from(salary_advance_schema_1.salaryAdvance)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, employee_id), (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.status, 'approved'), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.status, 'paid'))))
                .limit(1)
                .execute();
        }, {
            tags: [
                'loans',
                `company:${companyId}:loans`,
                `employee:${employee_id}:loans`,
            ],
        });
    }
    async salaryAdvanceRequest(dto, employee_id, user) {
        const employee = await this.getEmployee(employee_id);
        const [employeeCompensation] = await this.db
            .select()
            .from(compensation_schema_1.employeeCompensations)
            .where((0, drizzle_orm_1.eq)(compensation_schema_1.employeeCompensations.employeeId, employee.id))
            .execute();
        if (!employee) {
            throw new common_1.BadRequestException('Employee not found');
        }
        const settings = await this.payrollSettingsService.getLoanSettings(user.companyId);
        if (!settings.useLoan) {
            throw new common_1.BadRequestException('Salary advance is not enabled for this company');
        }
        const requestedAmount = new decimal_js_1.default(dto.amount);
        const minAmount = new decimal_js_1.default(settings.minAmount);
        const maxAmount = new decimal_js_1.default(settings.maxAmount);
        if (requestedAmount.lt(minAmount)) {
            throw new common_1.BadRequestException(`Requested amount is below the minimum allowed: ₦${minAmount.toFixed(2)}`);
        }
        if (requestedAmount.gt(maxAmount)) {
            throw new common_1.BadRequestException(`Requested amount exceeds the maximum allowed: ₦${maxAmount.toFixed(2)}`);
        }
        const maxFromSalary = new decimal_js_1.default(employeeCompensation.grossSalary).mul(settings.maxPercentOfSalary || 1);
        if (requestedAmount.gt(maxFromSalary)) {
            throw new common_1.BadRequestException('Requested amount exceeds max allowed based on salary');
        }
        const existingLoan = await this.db
            .select()
            .from(salary_advance_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, employee_id), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.status, 'paid'))))
            .execute();
        if (existingLoan.length > 0) {
            throw new common_1.BadRequestException('The employee already has an active loan');
        }
        const newLoan = await this.db.transaction(async (tx) => {
            const nextLoanNumber = await this.createLoanNumber(employee.companyId);
            const [loan] = await tx
                .insert(salary_advance_schema_1.salaryAdvance)
                .values({
                name: dto.name,
                employeeId: employee_id,
                companyId: employee.companyId,
                amount: requestedAmount.toFixed(2),
                status: 'pending',
                tenureMonths: dto.tenureMonths,
                preferredMonthlyPayment: new decimal_js_1.default(dto.preferredMonthlyPayment || 0).toFixed(2),
                loanNumber: nextLoanNumber,
            })
                .returning();
            await tx.insert(salary_advance_schema_1.salaryAdvanceHistory).values({
                salaryAdvanceId: loan.id,
                companyId: employee.companyId,
                action: 'requested',
            });
            await this.auditService.logAction({
                action: 'create',
                entity: 'salary_advance',
                entityId: loan.id,
                userId: user.id,
                details: `Requested a loan of ₦${requestedAmount.toFixed(2)} for ${dto.tenureMonths} months`,
                changes: {
                    amount: { before: null, after: requestedAmount.toFixed(2) },
                    tenureMonths: { before: null, after: dto.tenureMonths },
                    preferredMonthlyPayment: {
                        before: null,
                        after: dto.preferredMonthlyPayment,
                    },
                },
            });
            await this.pusher.createNotification(employee.companyId, `New loan request from ${employee.firstName} ${employee.lastName}`, 'loan');
            return loan;
        });
        await this.cache.bumpCompanyVersion(employee.companyId);
        await this.cache.invalidateTags([
            'loans',
            `company:${employee.companyId}:loans`,
            `employee:${employee_id}:loans`,
            `loan:${newLoan.id}`,
            'employees',
        ]);
        return newLoan;
    }
    async getAdvances(company_id) {
        return this.cache.getOrSetVersioned(company_id, ['loans', 'byCompany'], async () => {
            const allLoans = await this.db
                .select({
                name: salary_advance_schema_1.salaryAdvance.name,
                loanId: salary_advance_schema_1.salaryAdvance.id,
                amount: salary_advance_schema_1.salaryAdvance.amount,
                status: salary_advance_schema_1.salaryAdvance.status,
                totalPaid: salary_advance_schema_1.salaryAdvance.totalPaid,
                tenureMonths: salary_advance_schema_1.salaryAdvance.tenureMonths,
                preferredMonthlyPayment: salary_advance_schema_1.salaryAdvance.preferredMonthlyPayment,
                employeeName: (0, drizzle_orm_1.sql) `${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName}`,
                outstandingBalance: (0, drizzle_orm_1.sql) `(${salary_advance_schema_1.salaryAdvance.amount} - ${salary_advance_schema_1.salaryAdvance.totalPaid})`.as('outstandingBalance'),
                loanNumber: salary_advance_schema_1.salaryAdvance.loanNumber,
            })
                .from(salary_advance_schema_1.salaryAdvance)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.companyId, company_id))
                .execute();
            return allLoans;
        }, { tags: ['loans', `company:${company_id}:loans`] });
    }
    async getAdvancesByEmployee(employee_id) {
        const companyId = await this.getEmployeeCompanyId(employee_id);
        return this.cache.getOrSetVersioned(companyId, ['loans', 'byEmployee', employee_id], async () => {
            return await this.db
                .select()
                .from(salary_advance_schema_1.salaryAdvance)
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, employee_id))
                .execute();
        }, {
            tags: [
                'loans',
                `company:${companyId}:loans`,
                `employee:${employee_id}:loans`,
            ],
        });
    }
    async getAdvanceById(loan_id) {
        const [meta] = await this.db
            .select({
            companyId: salary_advance_schema_1.salaryAdvance.companyId,
            employeeId: salary_advance_schema_1.salaryAdvance.employeeId,
        })
            .from(salary_advance_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.id, loan_id))
            .execute();
        if (!meta)
            return undefined;
        return this.cache.getOrSetVersioned(meta.companyId, ['loans', 'byId', loan_id], async () => {
            const [loan] = await this.db
                .select()
                .from(salary_advance_schema_1.salaryAdvance)
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.id, loan_id))
                .execute();
            return loan;
        }, {
            tags: [
                'loans',
                `company:${meta.companyId}:loans`,
                `employee:${meta.employeeId}:loans`,
                `loan:${loan_id}`,
            ],
        });
    }
    async updateAdvanceStatus(loan_id, dto, user_id) {
        const [loan] = await this.db
            .select()
            .from(salary_advance_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.id, loan_id))
            .execute();
        if (!loan) {
            throw new common_1.BadRequestException('Loan not found');
        }
        const updatedLoan = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(salary_advance_schema_1.salaryAdvance)
                .set({ ...dto })
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.id, loan_id))
                .returning();
            await tx.insert(salary_advance_schema_1.salaryAdvanceHistory).values({
                salaryAdvanceId: loan_id,
                companyId: updated.companyId,
                action: dto.status,
                reason: dto.reason || null,
                actionBy: user_id,
                createdAt: new Date(),
            });
            await this.pusher.createNotification(loan.companyId, `New loan request updated to ${updated.status}`, 'loan');
            await this.pusher.createEmployeeNotification(loan.companyId, loan.employeeId, `Your loan request ${loan.loanNumber} has been ${updated.status}`, 'loan');
            await this.push.createAndSendToEmployee(loan.employeeId, {
                title: 'Loan Request Update',
                body: `Your loan request ${loan.loanNumber} has been ${updated.status}`,
                route: '/screens/dashboard/loans',
                data: {},
                type: 'message',
            });
            await this.auditService.logAction({
                action: 'update',
                entity: 'salary_advance',
                entityId: loan_id,
                userId: user_id,
                details: `Loan status updated to ${dto.status} by user ${user_id}`,
                changes: {
                    status: { before: loan.status, after: dto.status },
                    reason: { before: null, after: dto.reason },
                },
            });
            return updated;
        });
        await this.cache.bumpCompanyVersion(loan.companyId);
        await this.cache.invalidateTags([
            'loans',
            `company:${loan.companyId}:loans`,
            `employee:${loan.employeeId}:loans`,
            `loan:${loan_id}`,
        ]);
        return updatedLoan;
    }
    async repayAdvance(loan_id, amount) {
        const loan = await this.getAdvanceById(loan_id);
        if (!loan)
            throw new common_1.BadRequestException('Loan not found');
        const loanAmount = new decimal_js_1.default(loan.amount);
        const previousTotalPaid = new decimal_js_1.default(loan.totalPaid || 0);
        const repaymentAmount = new decimal_js_1.default(amount);
        const newTotalPaid = previousTotalPaid.plus(repaymentAmount);
        if (newTotalPaid.gt(loanAmount)) {
            return;
        }
        const newRepayment = await this.db.transaction(async (tx) => {
            const [repayment] = await tx
                .insert(salary_advance_schema_1.repayments)
                .values({
                salaryAdvanceId: loan_id,
                amountPaid: repaymentAmount.toFixed(2),
            })
                .returning();
            await tx
                .update(salary_advance_schema_1.salaryAdvance)
                .set({
                totalPaid: newTotalPaid.toFixed(2),
                status: newTotalPaid.eq(loanAmount) ? 'paid' : loan.status,
                paymentStatus: newTotalPaid.eq(loanAmount) ? 'closed' : loan.status,
            })
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.id, loan_id))
                .execute();
            await tx.insert(salary_advance_schema_1.salaryAdvanceHistory).values({
                salaryAdvanceId: loan_id,
                companyId: loan.companyId,
                action: 'repayment',
                reason: `Paid ₦${repaymentAmount.toFixed(2)}`,
                createdAt: new Date(),
            });
            return repayment;
        });
        await this.cache.bumpCompanyVersion(loan.companyId);
        await this.cache.invalidateTags([
            'loans',
            `company:${loan.companyId}:loans`,
            `employee:${loan.employeeId}:loans`,
            `loan:${loan_id}`,
        ]);
        return newRepayment;
    }
    async getAdvancesAndRepaymentsByEmployee(employee_id) {
        const companyId = await this.getEmployeeCompanyId(employee_id);
        return this.cache.getOrSetVersioned(companyId, ['loans', 'summaryByEmployee', employee_id], async () => {
            const loansWithRepayments = await this.db
                .select({
                loanId: salary_advance_schema_1.salaryAdvance.id,
                amount: salary_advance_schema_1.salaryAdvance.amount,
                status: salary_advance_schema_1.salaryAdvance.status,
                totalPaid: salary_advance_schema_1.salaryAdvance.totalPaid,
                tenureMonths: salary_advance_schema_1.salaryAdvance.tenureMonths,
                preferredMonthlyPayment: salary_advance_schema_1.salaryAdvance.preferredMonthlyPayment,
                name: salary_advance_schema_1.salaryAdvance.name,
                paymentStatus: salary_advance_schema_1.salaryAdvance.paymentStatus,
                createAt: salary_advance_schema_1.salaryAdvance.createdAt,
                outstandingBalance: (0, drizzle_orm_1.sql) `(${salary_advance_schema_1.salaryAdvance.amount} - ${salary_advance_schema_1.salaryAdvance.totalPaid})`.as('outstandingBalance'),
                loanNumber: salary_advance_schema_1.salaryAdvance.loanNumber,
            })
                .from(salary_advance_schema_1.salaryAdvance)
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, employee_id))
                .execute();
            return loansWithRepayments;
        }, {
            tags: [
                'loans',
                `company:${companyId}:loans`,
                `employee:${employee_id}:loans`,
            ],
        });
    }
    async getRepaymentByLoan(loan_id) {
        const loan = await this.getAdvanceById(loan_id);
        if (!loan)
            return undefined;
        return this.cache.getOrSetVersioned(loan.companyId, ['loans', 'repaymentsByLoan', loan_id], async () => {
            const rep = await this.db
                .select()
                .from(salary_advance_schema_1.repayments)
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.repayments.salaryAdvanceId, loan_id))
                .execute();
            return rep[0];
        }, { tags: ['loans', `company:${loan.companyId}:loans`, `loan:${loan_id}`] });
    }
    async getAdvanceHistoryByEmployee(employee_id) {
        const companyId = await this.getEmployeeCompanyId(employee_id);
        return this.cache.getOrSetVersioned(companyId, ['loans', 'historyByEmployee', employee_id], async () => {
            return await this.db
                .select()
                .from(salary_advance_schema_1.salaryAdvanceHistory)
                .innerJoin(salary_advance_schema_1.salaryAdvance, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvanceHistory.salaryAdvanceId, salary_advance_schema_1.salaryAdvance.id))
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, employee_id))
                .execute();
        }, {
            tags: [
                'loans',
                `company:${companyId}:loans`,
                `employee:${employee_id}:loans`,
            ],
        });
    }
    async getAdvancesHistoryByCompany(company_id) {
        return this.cache.getOrSetVersioned(company_id, ['loans', 'historyByCompany'], async () => {
            const history = await this.db
                .select({
                action: salary_advance_schema_1.salaryAdvanceHistory.action,
                reason: salary_advance_schema_1.salaryAdvanceHistory.reason,
                role: schema_1.companyRoles.name,
                createdAt: salary_advance_schema_1.salaryAdvanceHistory.createdAt,
                employee: (0, drizzle_orm_1.sql) `${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName}`.as('employee'),
            })
                .from(salary_advance_schema_1.salaryAdvanceHistory)
                .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvanceHistory.actionBy, schema_1.users.id))
                .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
                .innerJoin(salary_advance_schema_1.salaryAdvance, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvanceHistory.salaryAdvanceId, salary_advance_schema_1.salaryAdvance.id))
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvanceHistory.companyId, company_id))
                .limit(10)
                .orderBy((0, drizzle_orm_1.desc)(salary_advance_schema_1.salaryAdvanceHistory.createdAt))
                .execute();
            return history;
        }, { tags: ['loans', `company:${company_id}:loans`] });
    }
};
exports.SalaryAdvanceService = SalaryAdvanceService;
exports.SalaryAdvanceService = SalaryAdvanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        payroll_settings_service_1.PayrollSettingsService,
        pusher_service_1.PusherService,
        push_notification_service_1.PushNotificationService])
], SalaryAdvanceService);
//# sourceMappingURL=salary-advance.service.js.map