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
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const employee_schema_1 = require("../../drizzle/schema/employee.schema");
const drizzle_orm_1 = require("drizzle-orm");
const deductions_schema_1 = require("../../drizzle/schema/deductions.schema");
const payroll_schema_1 = require("../../drizzle/schema/payroll.schema");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const company_schema_1 = require("../../drizzle/schema/company.schema");
const cache_service_1 = require("../../config/cache/cache.service");
const uuid_1 = require("uuid");
const loan_service_1 = require("./loan.service");
let PayrollService = class PayrollService {
    constructor(db, payrollQueue, cache, loanService) {
        this.db = db;
        this.payrollQueue = payrollQueue;
        this.cache = cache;
        this.loanService = loanService;
        this.formattedDate = () => {
            const date = new Date();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const formattedDate = `${year}-${month}`;
            return formattedDate;
        };
        this.getCompany = async (company_id) => {
            const cacheKey = `company_id_${company_id}`;
            return this.cache.getOrSetCache(cacheKey, async () => {
                const company = await this.db
                    .select()
                    .from(company_schema_1.companies)
                    .where((0, drizzle_orm_1.eq)(company_schema_1.companies.id, company_id))
                    .execute();
                if (!company)
                    throw new common_1.BadRequestException('Company not found');
                return company[0].id;
            });
        };
    }
    calculatePAYE(annualSalary, applyPension, applyNHF) {
        let paye = 0;
        const personalAllowance = 200000 + 0.2 * annualSalary;
        let taxableIncome = Math.max(annualSalary - personalAllowance, 0);
        const pensionDeduction = applyPension ? 0.08 * annualSalary : 0;
        taxableIncome -= pensionDeduction;
        const nhfDeduction = applyNHF ? 0.025 * annualSalary : 0;
        taxableIncome -= nhfDeduction;
        taxableIncome = Math.max(taxableIncome, 0);
        const brackets = [
            { limit: 300000, rate: 0.07 },
            { limit: 300000, rate: 0.11 },
            { limit: 500000, rate: 0.15 },
            { limit: 500000, rate: 0.19 },
            { limit: 1600000, rate: 0.21 },
            { limit: Infinity, rate: 0.24 },
        ];
        let remainingIncome = taxableIncome;
        for (const bracket of brackets) {
            if (remainingIncome <= 0)
                break;
            const taxableAmount = Math.min(bracket.limit, remainingIncome);
            paye += taxableAmount * bracket.rate;
            remainingIncome -= taxableAmount;
        }
        return {
            paye: Math.floor(paye),
            taxableIncome: Math.floor(taxableIncome),
        };
    }
    async calculatePayroll(employee_id, payrollMonth, payrollRunId, company_id) {
        const employee = await this.db
            .select()
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.id, employee_id))
            .execute();
        if (!employee.length)
            throw new common_1.BadRequestException('Employee not found');
        const [customDeduction, bonuses, unpaidAdvance, tax] = await Promise.all([
            this.db
                .select()
                .from(deductions_schema_1.customDeductions)
                .where((0, drizzle_orm_1.eq)(deductions_schema_1.customDeductions.employee_id, employee[0].id))
                .execute(),
            this.db
                .select()
                .from(payroll_schema_1.bonus)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.bonus.employee_id, employee_id), (0, drizzle_orm_1.eq)(payroll_schema_1.bonus.payroll_month, payrollMonth)))
                .execute(),
            this.loanService.getUnpaidAdvanceDeductions(employee_id),
            this.db
                .select({
                apply_pension: deductions_schema_1.taxConfig.apply_pension,
                apply_paye: deductions_schema_1.taxConfig.apply_paye,
                apply_nhf: deductions_schema_1.taxConfig.apply_nhf,
            })
                .from(deductions_schema_1.taxConfig)
                .where((0, drizzle_orm_1.eq)(deductions_schema_1.taxConfig.company_id, company_id))
                .execute(),
        ]);
        const unpaidAdvanceAmount = Math.floor(unpaidAdvance?.[0]?.monthlyDeduction || 0);
        const grossSalary = Math.floor(Number(employee[0].annual_gross) / 12) -
            Math.floor(unpaidAdvanceAmount);
        const annualGross = Number(employee[0].annual_gross);
        const applyPension = tax[0].apply_pension;
        const applyNHF = tax[0].apply_nhf;
        const { paye, taxableIncome } = this.calculatePAYE(annualGross, applyPension, applyNHF);
        const monthlyPAYE = Math.floor(paye / 12);
        const employeePensionContribution = applyPension
            ? Math.floor((grossSalary * 8) / 100)
            : 0;
        const employerPensionContribution = applyPension
            ? Math.floor((grossSalary * 10) / 100)
            : 0;
        const nhfContribution = applyNHF
            ? Math.floor((grossSalary * 2.5) / 100)
            : 0;
        const totalCustomDeductions = Math.floor((customDeduction || []).reduce((sum, deduction) => sum + (deduction.amount || 0), 0));
        const totalBonuses = Math.floor((bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount), 0));
        const totalDeductions = Math.floor(monthlyPAYE +
            employeePensionContribution +
            nhfContribution +
            totalCustomDeductions);
        const netSalary = Math.max(0, Math.floor(grossSalary + totalBonuses - totalDeductions));
        const savedPayroll = await this.db
            .insert(payroll_schema_1.payroll)
            .values({
            employee_id: employee_id,
            company_id: employee[0].company_id,
            gross_salary: grossSalary,
            bonuses: totalBonuses,
            paye_tax: monthlyPAYE,
            pension_contribution: employeePensionContribution,
            employer_pension_contribution: employerPensionContribution,
            nhf_contribution: nhfContribution,
            custom_deductions: totalCustomDeductions,
            net_salary: netSalary,
            payroll_date: new Date().toISOString().split('T')[0],
            payroll_month: payrollMonth,
            total_deductions: totalDeductions,
            payroll_run_id: payrollRunId,
            taxable_income: taxableIncome,
            salary_advance: unpaidAdvanceAmount,
        })
            .returning()
            .execute();
        return savedPayroll;
    }
    async calculatePayrollForCompany(company_id, payrollMonth) {
        const companyId = await this.getCompany(company_id);
        const existingEmployees = await this.db
            .select({
            id: employee_schema_1.employees.id,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, companyId), (0, drizzle_orm_1.eq)(employee_schema_1.employees.employment_status, 'active')))
            .execute();
        if (existingEmployees.length === 0)
            throw new common_1.BadRequestException('No employees found for this company');
        const payrollRunId = (0, uuid_1.v4)();
        const payrollResults = await Promise.all(existingEmployees.map((employee) => this.calculatePayroll(employee.id, payrollMonth, payrollRunId, company_id)));
        await this.cache.del(`payroll_summary_${companyId}`);
        await this.cache.del(`payroll_status_${companyId}`);
        await this.payrollQueue.add('generatePayslips', {
            company_id,
            payrollMonth,
        });
        return payrollResults;
    }
    async getPayrollSummary(companyId) {
        const cacheKey = `payroll_summary_${companyId}`;
        const company_id = await this.getCompany(companyId);
        return this.cache.getOrSetCache(cacheKey, async () => {
            return await this.db
                .select({
                payroll_run_id: payroll_schema_1.payroll.payroll_run_id,
                payroll_date: payroll_schema_1.payroll.payroll_date,
                payroll_month: payroll_schema_1.payroll.payroll_month,
                approval_status: payroll_schema_1.payroll.approval_status,
                payment_status: payroll_schema_1.payroll.payment_status,
                total_gross_salary: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.gross_salary})`.as('total_gross_salary'),
                employee_count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${payroll_schema_1.payroll.employee_id})`.as('employee_count'),
                total_deductions: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.paye_tax} + ${payroll_schema_1.payroll.pension_contribution} + ${payroll_schema_1.payroll.nhf_contribution})`.as('total_deductions'),
                total_net_salary: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.net_salary})`.as('total_net_salary'),
            })
                .from(payroll_schema_1.payroll)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
                .groupBy(payroll_schema_1.payroll.payroll_run_id, payroll_schema_1.payroll.payroll_date, payroll_schema_1.payroll.payroll_month, payroll_schema_1.payroll.approval_status, payroll_schema_1.payroll.payment_status)
                .execute();
        });
    }
    async getPayrollStatus(companyId) {
        const company_id = await this.getCompany(companyId);
        const cacheKey = `payroll_status_${companyId}`;
        return this.cache.getOrSetCache(cacheKey, async () => {
            return await this.db
                .select({
                payroll_run_id: payroll_schema_1.payroll.payroll_run_id,
            })
                .from(payroll_schema_1.payroll)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.approval_status, 'pending')))
                .execute();
        });
    }
    async updatePayrollApprovalStatus(user_id, payroll_run_id, approval_status) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .update(payroll_schema_1.payroll)
            .set({ approval_status })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_run_id, payroll_run_id)))
            .returning()
            .execute();
        await this.cache.del(`payroll_summary_${user_id}`);
        await this.cache.del(`payroll_status_${user_id}`);
        return result;
    }
    async updatePayrollPaymentStatus(user_id, payroll_run_id, payment_status) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .update(payroll_schema_1.payroll)
            .set({
            payment_status,
            payment_date: new Date().toISOString().split('T')[0],
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_run_id, payroll_run_id)))
            .returning({
            payroll_month: payroll_schema_1.payroll.payroll_month,
        })
            .execute();
        await this.cache.del(`payroll_summary_${user_id}`);
        await this.cache.del(`payroll_status_${user_id}`);
        await this.payrollQueue.add('populateTaxDetails', {
            company_id,
            payrollMonth: result[0].payroll_month,
        });
        const getPayslips = await this.db
            .select()
            .from(payroll_schema_1.payslips)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payslips.payroll_month, result[0].payroll_month))
            .execute();
        for (const payslip of getPayslips) {
            await this.payrollQueue.add('generatePayslipPdf', {
                payslipId: payslip.id,
            });
        }
        return result;
    }
    async deletePayroll(company_id, payroll_run_id) {
        const companyId = await this.getCompany(company_id);
        const result = await this.db
            .delete(payroll_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, companyId), (0, drizzle_orm_1.eq)(payroll_schema_1.payroll.payroll_run_id, payroll_run_id)))
            .execute();
        await this.cache.del(`payroll_summary_${company_id}`);
        await this.cache.del(`payroll_status_${company_id}`);
        return result;
    }
    async getSalaryBreakdown(user_id) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .select({
            id: payroll_schema_1.salaryBreakdown.id,
            basic: payroll_schema_1.salaryBreakdown.basic,
            housing: payroll_schema_1.salaryBreakdown.housing,
            transport: payroll_schema_1.salaryBreakdown.transport,
            others: payroll_schema_1.salaryBreakdown.others,
        })
            .from(payroll_schema_1.salaryBreakdown)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
            .execute();
        if (result.length === 0) {
            return null;
        }
        return result[0];
    }
    async createSalaryBreakdown(user_id, dto) {
        const company_id = await this.getCompany(user_id);
        const existingBreakdown = await this.db
            .select()
            .from(payroll_schema_1.salaryBreakdown)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
            .execute();
        if (existingBreakdown.length > 0) {
            const result = await this.db
                .update(payroll_schema_1.salaryBreakdown)
                .set(dto)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
                .returning()
                .execute();
            return result;
        }
        else {
            const result = await this.db
                .insert(payroll_schema_1.salaryBreakdown)
                .values({
                company_id,
                ...dto,
            })
                .returning()
                .execute();
            return result;
        }
    }
    async deleteSalaryBreakdown(user_id) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .delete(payroll_schema_1.salaryBreakdown)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
            .execute();
        return result;
    }
    async createBonus(user_id, dto) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .insert(payroll_schema_1.bonus)
            .values({
            company_id,
            payroll_month: this.formattedDate(),
            ...dto,
        })
            .returning()
            .execute();
        return result;
    }
    async getBonuses(user_id) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .select({
            id: payroll_schema_1.bonus.id,
            employee_id: payroll_schema_1.bonus.employee_id,
            amount: payroll_schema_1.bonus.amount,
            bonus_type: payroll_schema_1.bonus.bonus_type,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            payroll_month: payroll_schema_1.bonus.payroll_month,
        })
            .from(payroll_schema_1.bonus)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.bonus.company_id, company_id))
            .leftJoin(employee_schema_1.employees, (0, drizzle_orm_1.eq)(payroll_schema_1.bonus.employee_id, employee_schema_1.employees.id))
            .execute();
        return result;
    }
    async deleteBonus(user_id, id) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .delete(payroll_schema_1.bonus)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.bonus.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.bonus.id, id)))
            .execute();
        return result;
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('payrollQueue')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue,
        cache_service_1.CacheService,
        loan_service_1.LoanService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map