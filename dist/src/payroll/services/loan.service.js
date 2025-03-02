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
exports.LoanService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const loans_schema_1 = require("../../drizzle/schema/loans.schema");
const cache_service_1 = require("../../config/cache/cache.service");
const users_schema_1 = require("../../drizzle/schema/users.schema");
const pusher_service_1 = require("../../notification/services/pusher.service");
let LoanService = class LoanService {
    constructor(db, cache, pusher) {
        this.db = db;
        this.cache = cache;
        this.pusher = pusher;
    }
    async getEmployee(employee_id) {
        const cacheKey = `employee:${employee_id}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            const employee = await this.db
                .select()
                .from(employee_schema_1.employees)
                .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
                .execute();
            return employee[0];
        });
    }
    async getUnpaidAdvanceDeductions(employee_id) {
        return await this.db
            .select({
            loanId: loans_schema_1.salaryAdvance.id,
            monthlyDeduction: (0, drizzle_orm_1.sql) `
        (${loans_schema_1.salaryAdvance.amount} - ${loans_schema_1.salaryAdvance.total_paid}) / 
        GREATEST(${loans_schema_1.salaryAdvance.tenureMonths} - DATE_PART('month', AGE(NOW(), ${loans_schema_1.salaryAdvance.createdAt})), 1)
      `.as('monthlyDeduction'),
        })
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_id), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.status, 'paid'))))
            .limit(1)
            .execute();
    }
    async salaryAdvanceRequest(dto, employee_id) {
        const employee = await this.getEmployee(employee_id);
        if (!employee) {
            throw new common_1.BadRequestException('Employee not found');
        }
        const existingLoan = await this.db
            .select()
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_id), (0, drizzle_orm_1.not)((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.status, 'paid'))))
            .execute();
        if (existingLoan.length > 0) {
            throw new common_1.BadRequestException('The Employee already has an active loan');
        }
        const newLoan = await this.db.transaction(async (tx) => {
            const [loan] = await tx
                .insert(loans_schema_1.salaryAdvance)
                .values({
                employee_id: employee_id,
                company_id: employee.company_id,
                amount: dto.amount,
                status: 'pending',
                tenureMonths: dto.tenureMonths,
                preferredMonthlyPayment: dto.preferredMonthlyPayment,
            })
                .returning();
            await tx.insert(loans_schema_1.salaryAdvanceHistory).values({
                salaryAdvance_id: loan.id,
                company_id: employee.company_id,
                action: 'requested',
            });
            await this.pusher.createNotification(employee.company_id, `New loan request from ${employee.first_name} ${employee.last_name}`, 'loan');
            return loan;
        });
        return newLoan;
    }
    async getAdvances(company_id) {
        const allLoans = await this.db
            .select({
            loanId: loans_schema_1.salaryAdvance.id,
            amount: loans_schema_1.salaryAdvance.amount,
            status: loans_schema_1.salaryAdvance.status,
            totalPaid: loans_schema_1.salaryAdvance.total_paid,
            tenureMonths: loans_schema_1.salaryAdvance.tenureMonths,
            preferredMonthlyPayment: loans_schema_1.salaryAdvance.preferredMonthlyPayment,
            employeeName: (0, drizzle_orm_1.sql) `${employee_schema_1.employees.first_name} || ' ' || ${employee_schema_1.employees.last_name}`,
        })
            .from(loans_schema_1.salaryAdvance)
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.company_id, company_id))
            .execute();
        return allLoans;
    }
    async getAdvancesByEmployee(employee_id) {
        const allLoans = await this.db
            .select()
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_id))
            .execute();
        return allLoans;
    }
    async getAdvanceById(loan_id) {
        const loan = await this.db
            .select()
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.id, loan_id))
            .execute();
        return loan[0];
    }
    async updateAdvanceStatus(loan_id, dto, user_id) {
        const loan = await this.db
            .select()
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.id, loan_id))
            .execute();
        if (!loan.length) {
            throw new common_1.BadRequestException('Loan not found');
        }
        const updatedLoan = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(loans_schema_1.salaryAdvance)
                .set({ ...dto })
                .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.id, loan_id))
                .returning();
            await tx.insert(loans_schema_1.salaryAdvanceHistory).values({
                salaryAdvance_id: loan_id,
                company_id: updated.company_id,
                action: dto.status,
                reason: dto.reason || null,
                action_by: user_id,
                created_at: new Date(),
            });
            await this.pusher.createNotification(loan[0].company_id, `New loan request updated to ${updated.status}`, 'loan');
            return updated;
        });
        return updatedLoan;
    }
    async deleteAdvance(loan_id) {
        const loan = await this.db
            .delete(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.id, loan_id))
            .execute();
        return loan;
    }
    async repayAdvance(loan_id, amount) {
        const loan = await this.getAdvanceById(loan_id);
        if (!loan) {
            throw new common_1.BadRequestException('Loan not found');
        }
        const loanAmount = parseFloat(loan.amount);
        const previousTotalPaid = parseFloat(loan.total_paid || '0');
        const repaymentAmount = parseFloat(amount);
        const newTotalPaid = previousTotalPaid + repaymentAmount;
        if (newTotalPaid > loanAmount) {
            throw new common_1.BadRequestException('Repayment exceeds the loan amount');
        }
        const newRepayment = await this.db.transaction(async (tx) => {
            const [repayment] = await tx
                .insert(loans_schema_1.repayments)
                .values({
                salary_advance_id: loan_id,
                amount_paid: amount,
            })
                .returning();
            await tx
                .update(loans_schema_1.salaryAdvance)
                .set({
                total_paid: newTotalPaid.toString(),
                status: newTotalPaid === loanAmount ? 'paid' : loan.status,
            })
                .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.id, loan_id))
                .execute();
            await tx.insert(loans_schema_1.salaryAdvanceHistory).values({
                salaryAdvance_id: loan_id,
                company_id: loan.company_id,
                action: 'repayment',
                reason: `Paid ${amount}`,
                created_at: new Date(),
            });
            return repayment;
        });
        return newRepayment;
    }
    async getAdvancesAndRepaymentsByEmployee(employee_id) {
        const loansWithRepayments = await this.db
            .select({
            loanId: loans_schema_1.salaryAdvance.id,
            amount: loans_schema_1.salaryAdvance.amount,
            status: loans_schema_1.salaryAdvance.status,
            totalPaid: loans_schema_1.salaryAdvance.total_paid,
            outstandingBalance: (0, drizzle_orm_1.sql) `(${loans_schema_1.salaryAdvance.amount} - ${loans_schema_1.salaryAdvance.total_paid})`.as('outstandingBalance'),
        })
            .from(loans_schema_1.salaryAdvance)
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_id))
            .execute();
        return loansWithRepayments;
    }
    async getRepaymentByLoan(loan_id) {
        const repayment = await this.db
            .select()
            .from(loans_schema_1.repayments)
            .where((0, drizzle_orm_1.eq)(loans_schema_1.repayments.salary_advance_id, loan_id))
            .execute();
        return repayment[0];
    }
    async getAdvanceHistoryByEmployee(employee_id) {
        return await this.db
            .select()
            .from(loans_schema_1.salaryAdvanceHistory)
            .innerJoin(loans_schema_1.salaryAdvance, (0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvanceHistory.salaryAdvance_id, loans_schema_1.salaryAdvance.id))
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_id))
            .execute();
    }
    async getAdvancesHistoryByCompany(company_id) {
        const history = await this.db
            .select({
            action: loans_schema_1.salaryAdvanceHistory.action,
            reason: loans_schema_1.salaryAdvanceHistory.reason,
            actionBy: users_schema_1.users.role,
            createdAt: loans_schema_1.salaryAdvanceHistory.created_at,
            employee: (0, drizzle_orm_1.sql) `${employee_schema_1.employees.first_name} || ' ' || ${employee_schema_1.employees.last_name}`.as('employee'),
        })
            .from(loans_schema_1.salaryAdvanceHistory)
            .innerJoin(loans_schema_1.salaryAdvance, (0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvanceHistory.salaryAdvance_id, loans_schema_1.salaryAdvance.id))
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_schema_1.employees.id))
            .innerJoin(users_schema_1.users, (0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvanceHistory.action_by, users_schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvanceHistory.company_id, company_id))
            .limit(10)
            .orderBy((0, drizzle_orm_1.desc)(loans_schema_1.salaryAdvanceHistory.created_at))
            .execute();
        return history;
    }
};
exports.LoanService = LoanService;
exports.LoanService = LoanService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        pusher_service_1.PusherService])
], LoanService);
//# sourceMappingURL=loan.service.js.map