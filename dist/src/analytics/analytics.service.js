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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const payroll_schema_1 = require("../drizzle/schema/payroll.schema");
const employee_schema_1 = require("../drizzle/schema/employee.schema");
const department_schema_1 = require("../drizzle/schema/department.schema");
const loans_schema_1 = require("../drizzle/schema/loans.schema");
let AnalyticsService = class AnalyticsService {
    constructor(db) {
        this.db = db;
    }
    async getPayrollOverview(company_id) {
        const overview = await this.db
            .select({
            payrollMonth: payroll_schema_1.payroll.payroll_month,
            totalPayrollCost: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.gross_salary),
            totalNetSalaries: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.net_salary),
            totalDeductions: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.total_deductions),
            totalBonuses: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.bonuses),
            employeesProcessed: (0, drizzle_orm_1.count)(),
            paymentStatus: payroll_schema_1.payroll.payment_status,
        })
            .from(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
            .groupBy(payroll_schema_1.payroll.payroll_month, payroll_schema_1.payroll.payment_status)
            .orderBy((0, drizzle_orm_1.desc)(payroll_schema_1.payroll.payroll_month))
            .execute();
        return overview;
    }
    async employeesSalaryBreakdown(company_id) {
        return await this.db.transaction(async (tx) => {
            const salaryBreakdown = await tx
                .select({
                payrollMonth: payroll_schema_1.payroll.payroll_month,
                employeeId: payroll_schema_1.payroll.employee_id,
                employeeName: (0, drizzle_orm_1.sql) `${employee_schema_1.employees.first_name} || ' ' || ${employee_schema_1.employees.last_name}`.as('employeeName'),
                grossSalary: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.gross_salary).as('grossSalary'),
                netSalary: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.net_salary).as('netSalary'),
                deductions: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.total_deductions).as('deductions'),
                bonuses: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.bonuses).as('bonuses'),
                paymentStatus: payroll_schema_1.payroll.payment_status,
            })
                .from(payroll_schema_1.payroll)
                .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
                .groupBy(payroll_schema_1.payroll.payroll_month, payroll_schema_1.payroll.employee_id, employee_schema_1.employees.first_name, employee_schema_1.employees.last_name, payroll_schema_1.payroll.payment_status)
                .execute();
            const salaryStats = await tx
                .select({
                avgSalary: (0, drizzle_orm_1.avg)(payroll_schema_1.payroll.net_salary).as('avgSalary'),
                highestPaid: (0, drizzle_orm_1.max)(payroll_schema_1.payroll.net_salary).as('highestPaid'),
                lowestPaid: (0, drizzle_orm_1.min)(payroll_schema_1.payroll.net_salary).as('lowestPaid'),
            })
                .from(payroll_schema_1.payroll)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
                .execute();
            const salaryDistribution = await tx
                .select({
                salaryRange: (0, drizzle_orm_1.sql) `
          CASE
            WHEN ${payroll_schema_1.payroll.net_salary} < 5000000 THEN 'Below 50K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 5000000 AND 10000000 THEN '50K - 100K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 10000000 AND 20000000 THEN '100K - 200K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 20000000 AND 50000000 THEN '200K - 500K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 50000000 AND 100000000 THEN '500K - 1M'
            ELSE 'Above 1M'
          END
        `.as('salaryRange'),
                count: (0, drizzle_orm_1.countDistinct)(payroll_schema_1.payroll.employee_id).as('count'),
            })
                .from(payroll_schema_1.payroll)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
                .groupBy((0, drizzle_orm_1.sql) `
          CASE
            WHEN ${payroll_schema_1.payroll.net_salary} < 5000000 THEN 'Below 50K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 5000000 AND 10000000 THEN '50K - 100K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 10000000 AND 20000000 THEN '100K - 200K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 20000000 AND 50000000 THEN '200K - 500K'
            WHEN ${payroll_schema_1.payroll.net_salary} BETWEEN 50000000 AND 100000000 THEN '500K - 1M'
            ELSE 'Above 1M'
          END
        `)
                .execute();
            const spendByDepartment = await tx
                .select({
                totalNetSalary: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.net_salary).as('totalNetSalary'),
                departmentName: department_schema_1.departments.name,
            })
                .from(payroll_schema_1.payroll)
                .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
                .innerJoin(department_schema_1.departments, (0, drizzle_orm_1.eq)(employee_schema_1.employees.department_id, department_schema_1.departments.id))
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
                .groupBy(department_schema_1.departments.name)
                .execute();
            return {
                salaryBreakdown,
                salaryStats: salaryStats[0],
                salaryDistribution,
                spendByDepartment,
            };
        });
    }
    async getDeductionsReport(company_id) {
        const deductions = await this.db
            .select({
            payroll_month: payroll_schema_1.payroll.payroll_month,
            paye: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.paye_tax})`,
            pension: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.pension_contribution} + ${payroll_schema_1.payroll.employer_pension_contribution})`,
            nhf: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.nhf_contribution})`,
            custom: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.custom_deductions})`,
        })
            .from(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
            .orderBy(payroll_schema_1.payroll.payroll_month)
            .groupBy(payroll_schema_1.payroll.payroll_month);
        const topEmployees = await this.db
            .select({
            employee_name: (0, drizzle_orm_1.sql) `${employee_schema_1.employees.first_name} || ' ' || ${employee_schema_1.employees.last_name}`.as('employee_name'),
            total_deductions: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.total_deductions).as('total_deductions'),
        })
            .from(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.employee_id, employee_schema_1.employees.id))
            .groupBy(employee_schema_1.employees.first_name, employee_schema_1.employees.last_name)
            .orderBy((0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.total_deductions}) DESC`)
            .limit(5);
        return { deductions, topEmployees };
    }
    async getCompanyFinanceReport(companyId, startDate, endDate) {
        const dateFilter = startDate && endDate
            ? (0, drizzle_orm_1.between)(loans_schema_1.salaryAdvance.createdAt, new Date('2025-01-01'), new Date('2025-01-03'))
            : undefined;
        const salaryAdvances = await this.db
            .select({
            id: loans_schema_1.salaryAdvance.id,
            amount: loans_schema_1.salaryAdvance.amount,
            status: loans_schema_1.salaryAdvance.status,
            employeeName: (0, drizzle_orm_1.sql) `${employee_schema_1.employees.first_name} || ' ' || ${employee_schema_1.employees.last_name}`.as('employeeName'),
        })
            .from(loans_schema_1.salaryAdvance)
            .innerJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.employee_id, employee_schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(loans_schema_1.salaryAdvance.company_id, companyId), dateFilter))
            .execute();
        let totalLoanAmount = 0;
        let totalRepaid = 0;
        let totalOutstanding = 0;
        const statusBreakdown = {};
        const repaymentData = await this.db
            .select({
            loanId: loans_schema_1.repayments.salary_advance_id,
            totalPaid: (0, drizzle_orm_1.sum)(loans_schema_1.repayments.amount_paid),
        })
            .from(loans_schema_1.repayments)
            .where((0, drizzle_orm_1.inArray)(loans_schema_1.repayments.salary_advance_id, salaryAdvances.map((loan) => loan.id)))
            .groupBy(loans_schema_1.repayments.salary_advance_id)
            .execute();
        const repaymentMap = new Map(repaymentData.map((r) => [r.loanId, r.totalPaid || 0]));
        for (const loan of salaryAdvances) {
            totalLoanAmount += loan.amount;
            const totalPaid = repaymentMap.get(loan.id) || 0;
            const outstandingBalance = loan.amount - parseFloat(totalPaid.toString());
            totalRepaid += parseFloat(totalPaid.toString());
            totalOutstanding += outstandingBalance;
            statusBreakdown[loan.status] = (statusBreakdown[loan.status] || 0) + 1;
        }
        const bonuses = await this.db
            .select({
            payrollMonth: payroll_schema_1.payroll.payroll_month,
            totalBonuses: (0, drizzle_orm_1.sum)(payroll_schema_1.payroll.bonuses),
            paymentStatus: payroll_schema_1.payroll.payment_status,
        })
            .from(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, companyId), dateFilter))
            .groupBy(payroll_schema_1.payroll.payroll_month, payroll_schema_1.payroll.payment_status)
            .orderBy((0, drizzle_orm_1.desc)(payroll_schema_1.payroll.payroll_month))
            .execute();
        const removeBonus = bonuses.filter((bonus) => Number(bonus.totalBonuses) !== 0);
        return {
            report_period: startDate && endDate ? `${startDate} to ${endDate}` : 'All Time',
            loans: {
                total_loans_given: totalLoanAmount,
                total_repaid: totalRepaid,
                total_outstanding: totalOutstanding,
                status_breakdown: statusBreakdown,
                details: salaryAdvances,
            },
            bonuses: {
                details: removeBonus,
            },
        };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map