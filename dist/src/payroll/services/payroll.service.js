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
const tax_service_1 = require("./tax.service");
let PayrollService = class PayrollService {
    constructor(db, payrollQueue, cache, loanService, taxService) {
        this.db = db;
        this.payrollQueue = payrollQueue;
        this.cache = cache;
        this.loanService = loanService;
        this.taxService = taxService;
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
    calculatePAYE(annualSalary, pensionDeduction, nhfDeduction) {
        let paye = 0;
        const redefinedAnnualSalary = annualSalary - pensionDeduction * 12 - nhfDeduction * 12;
        const personalAllowance = 200000 * 100 + 0.2 * redefinedAnnualSalary;
        const taxableIncome = Math.max(annualSalary -
            personalAllowance -
            pensionDeduction * 12 -
            nhfDeduction * 12, 0);
        const brackets = [
            { limit: 300000 * 100, rate: 0.07 },
            { limit: 600000 * 100, rate: 0.11 },
            { limit: 1100000 * 100, rate: 0.15 },
            { limit: 1600000 * 100, rate: 0.19 },
            { limit: 3200000 * 100, rate: 0.21 },
            { limit: Infinity, rate: 0.24 },
        ];
        let remainingIncome = taxableIncome;
        let previousLimit = 0;
        for (const bracket of brackets) {
            if (remainingIncome <= 0)
                break;
            const taxableAmount = Math.min(remainingIncome, bracket.limit - previousLimit);
            paye += taxableAmount * bracket.rate;
            remainingIncome -= taxableAmount;
            previousLimit = bracket.limit;
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
        const [customDeduction, bonuses, unpaidAdvance, companyTaxConfig, salary, allowances,] = await Promise.all([
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
                .select()
                .from(deductions_schema_1.taxConfig)
                .where((0, drizzle_orm_1.eq)(deductions_schema_1.taxConfig.company_id, company_id))
                .execute(),
            this.db
                .select()
                .from(payroll_schema_1.salaryBreakdown)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
                .execute(),
            this.db
                .select()
                .from(payroll_schema_1.companyAllowances)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.companyAllowances.company_id, company_id))
                .execute(),
        ]);
        if (!salary.length)
            throw new common_1.BadRequestException('Salary structure not found');
        const unpaidAdvanceAmount = unpaidAdvance?.[0]?.monthlyDeduction || 0;
        const grossSalaryBeforeDeductions = Number(employee[0].annual_gross) / 12;
        const grossSalary = grossSalaryBeforeDeductions;
        const basic = (Number(salary[0].basic) / 100) * grossSalary;
        const housing = (Number(salary[0].housing) / 100) * grossSalary;
        const transport = (Number(salary[0].transport) / 100) * grossSalary;
        const BHT = basic + housing + transport;
        const payrollAllowancesData = allowances.map((allowance) => {
            const amount = Math.floor((Number(allowance.allowance_percentage) / 100) * grossSalary);
            return {
                allowance_type: allowance.allowance_type,
                allowance_amount: amount,
            };
        });
        let applyPension = false;
        let applyNHF = false;
        const payGroup = await this.db
            .select()
            .from(payroll_schema_1.payGroups)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.id, employee[0].group_id))
            .execute();
        if (!payGroup.length) {
            applyPension = companyTaxConfig[0]?.apply_pension || false;
            applyNHF = companyTaxConfig[0]?.apply_nhf || false;
        }
        else {
            applyPension = payGroup[0]?.apply_pension || false;
            applyNHF = payGroup[0]?.apply_nhf || false;
        }
        const employeePensionContribution = applyPension ? (BHT * 8) / 100 : 0;
        const employerPensionContribution = applyPension ? (BHT * 10) / 100 : 0;
        const nhfContribution = applyNHF && employee[0].apply_nhf ? (basic * 2.5) / 100 : 0;
        const { paye, taxableIncome } = this.calculatePAYE(Number(employee[0].annual_gross), employeePensionContribution, nhfContribution);
        const monthlyPAYE = paye / 12;
        const totalCustomDeductions = (customDeduction || []).reduce((sum, deduction) => sum + (deduction.amount || 0), 0);
        const totalBonuses = (bonuses || []).reduce((sum, bonus) => sum + Number(bonus.amount), 0);
        const totalDeductions = monthlyPAYE +
            employeePensionContribution +
            nhfContribution +
            totalCustomDeductions;
        const netSalary = Math.max(0, grossSalary + totalBonuses - totalDeductions - unpaidAdvanceAmount);
        const savedPayroll = await this.db
            .insert(payroll_schema_1.payroll)
            .values({
            payroll_run_id: payrollRunId,
            employee_id: employee_id,
            company_id: company_id,
            basic: Math.floor(basic),
            housing: Math.floor(housing),
            transport: Math.floor(transport),
            gross_salary: Math.floor(grossSalary),
            pension_contribution: Math.floor(employeePensionContribution),
            employer_pension_contribution: Math.floor(employerPensionContribution),
            bonuses: Math.floor(totalBonuses),
            nhf_contribution: Math.floor(nhfContribution),
            paye_tax: Math.floor(monthlyPAYE),
            salary_advance: unpaidAdvanceAmount,
            custom_deductions: Math.floor(totalCustomDeductions),
            total_deductions: Math.floor(totalDeductions),
            taxable_income: Math.floor(taxableIncome),
            net_salary: Math.floor(netSalary),
            payroll_date: new Date().toISOString().split('T')[0],
            payroll_month: payrollMonth,
        })
            .returning()
            .execute();
        await this.db
            .insert(payroll_schema_1.ytdPayroll)
            .values({
            employee_id: employee_id,
            payroll_month: payrollMonth,
            payroll_id: savedPayroll[0].id,
            company_id: company_id,
            year: new Date().getFullYear(),
            gross_salary: Math.floor(grossSalary),
            net_salary: Math.floor(netSalary),
            total_deductions: Math.floor(totalDeductions),
            bonuses: Math.floor(totalBonuses),
        })
            .execute();
        if (payrollAllowancesData.length > 0) {
            await this.db
                .insert(payroll_schema_1.payrollAllowances)
                .values(payrollAllowancesData.map((allowance) => ({
                payroll_id: savedPayroll[0].id,
                ...allowance,
            })))
                .execute();
        }
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
                total_deductions: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.paye_tax} + ${payroll_schema_1.payroll.pension_contribution} + ${payroll_schema_1.payroll.nhf_contribution} + + ${payroll_schema_1.payroll.employer_pension_contribution})`.as('total_deductions'),
                total_net_salary: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.net_salary})`.as('total_net_salary'),
                totalPayrollCost: (0, drizzle_orm_1.sql) `SUM(${payroll_schema_1.payroll.gross_salary}+ ${payroll_schema_1.payroll.pension_contribution} + ${payroll_schema_1.payroll.nhf_contribution} + + ${payroll_schema_1.payroll.employer_pension_contribution})`.as('totalPayrollCost'),
            })
                .from(payroll_schema_1.payroll)
                .where((0, drizzle_orm_1.eq)(payroll_schema_1.payroll.company_id, company_id))
                .orderBy((0, drizzle_orm_1.desc)(payroll_schema_1.payroll.payroll_date))
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
        await this.taxService.onPayrollApproval(company_id, result[0].payroll_month, payroll_run_id);
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
            allowance_percentage: payroll_schema_1.companyAllowances.allowance_percentage,
            allowance_type: payroll_schema_1.companyAllowances.allowance_type,
            allowance_id: payroll_schema_1.companyAllowances.id,
        })
            .from(payroll_schema_1.salaryBreakdown)
            .leftJoin(payroll_schema_1.companyAllowances, (0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, payroll_schema_1.companyAllowances.company_id))
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
            .execute();
        if (result.length === 0) {
            return null;
        }
        const formattedResult = {
            id: result[0].id,
            basic: result[0].basic,
            housing: result[0].housing,
            transport: result[0].transport,
            allowances: result
                .filter((row) => row.allowance_type)
                .map((row) => ({
                type: row.allowance_type,
                percentage: row.allowance_percentage,
                id: row.allowance_id,
            })),
        };
        return formattedResult;
    }
    async createUpdateSalaryBreakdown(user_id, dto) {
        const company_id = await this.getCompany(user_id);
        const { allowances, ...salaryBreakdownData } = dto;
        const result = await this.db
            .update(payroll_schema_1.salaryBreakdown)
            .set(salaryBreakdownData)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.salaryBreakdown.company_id, company_id))
            .returning()
            .execute();
        if (Array.isArray(allowances) && allowances.length > 0) {
            for (const allowance of allowances) {
                const { allowance_type, allowance_percentage } = allowance;
                if (!allowance_type || !allowance_percentage) {
                    continue;
                }
                const existingAllowance = await this.db
                    .select()
                    .from(payroll_schema_1.companyAllowances)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.companyAllowances.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.companyAllowances.allowance_type, allowance_type)))
                    .execute();
                if (existingAllowance.length > 0) {
                    await this.db
                        .update(payroll_schema_1.companyAllowances)
                        .set({ allowance_percentage })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_schema_1.companyAllowances.company_id, company_id), (0, drizzle_orm_1.eq)(payroll_schema_1.companyAllowances.allowance_type, allowance_type)))
                        .execute();
                }
                else {
                    await this.db
                        .insert(payroll_schema_1.companyAllowances)
                        .values({
                        company_id,
                        allowance_type,
                        allowance_percentage,
                    })
                        .execute();
                }
            }
        }
        return result;
    }
    async deleteSalaryBreakdown(user_id, id) {
        console.log(id);
        await this.db
            .delete(payroll_schema_1.companyAllowances)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.companyAllowances.id, id))
            .execute();
    }
    async createBonus(user_id, dto) {
        const company_id = await this.getCompany(user_id);
        const result = await this.db
            .insert(payroll_schema_1.bonus)
            .values({
            company_id,
            payroll_month: this.formattedDate(),
            ...dto,
            amount: dto.amount * 100,
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
    async getPayrollPreviewDetails(company_id) {
        const allEmployees = await this.db
            .select({
            id: employee_schema_1.employees.id,
            employee_number: employee_schema_1.employees.employee_number,
            first_name: employee_schema_1.employees.first_name,
            last_name: employee_schema_1.employees.last_name,
            email: employee_schema_1.employees.email,
            annual_gross: employee_schema_1.employees.annual_gross,
            employment_status: employee_schema_1.employees.employment_status,
            group_id: employee_schema_1.employees.group_id,
            apply_nhf: employee_schema_1.employees.apply_nhf,
        })
            .from(employee_schema_1.employees)
            .where((0, drizzle_orm_1.eq)(employee_schema_1.employees.company_id, company_id))
            .execute();
        const groups = await this.db
            .select({
            id: payroll_schema_1.payGroups.id,
            name: payroll_schema_1.payGroups.name,
            apply_pension: payroll_schema_1.payGroups.apply_pension,
            apply_nhf: payroll_schema_1.payGroups.apply_nhf,
            apply_paye: payroll_schema_1.payGroups.apply_paye,
            apply_additional: payroll_schema_1.payGroups.apply_additional,
        })
            .from(payroll_schema_1.payGroups)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.payGroups.company_id, company_id))
            .execute();
        const payrollSummary = await this.getPayrollSummary(company_id);
        const salaryBreakdown = await this.getSalaryBreakdown(company_id);
        const customDeduction = await this.db
            .select({
            id: deductions_schema_1.customDeductions.id,
            employee_id: deductions_schema_1.customDeductions.employee_id,
            amount: deductions_schema_1.customDeductions.amount,
        })
            .from(deductions_schema_1.customDeductions)
            .where((0, drizzle_orm_1.eq)(deductions_schema_1.customDeductions.company_id, company_id))
            .execute();
        const bonuses = await this.db
            .select({
            employee_id: payroll_schema_1.bonus.employee_id,
            amount: payroll_schema_1.bonus.amount,
        })
            .from(payroll_schema_1.bonus)
            .where((0, drizzle_orm_1.eq)(payroll_schema_1.bonus.company_id, company_id))
            .execute();
        const taxConfigDetails = await this.db
            .select({
            apply_pension: deductions_schema_1.taxConfig.apply_pension,
            apply_nhf: deductions_schema_1.taxConfig.apply_nhf,
            apply_paye: deductions_schema_1.taxConfig.apply_paye,
        })
            .from(deductions_schema_1.taxConfig)
            .where((0, drizzle_orm_1.eq)(deductions_schema_1.taxConfig.company_id, company_id))
            .execute();
        return {
            allEmployees,
            groups,
            payrollSummary,
            salaryBreakdown,
            customDeduction,
            bonuses,
            taxConfig: taxConfigDetails[0],
        };
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(1, (0, bullmq_1.InjectQueue)('payrollQueue')),
    __metadata("design:paramtypes", [Object, bullmq_2.Queue,
        cache_service_1.CacheService,
        loan_service_1.LoanService,
        tax_service_1.TaxService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map