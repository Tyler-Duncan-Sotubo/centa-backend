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
exports.RunService = void 0;
const common_1 = require("@nestjs/common");
const p_map_1 = require("p-map");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const audit_service_1 = require("../../audit/audit.service");
const payroll_allowances_schema_1 = require("../schema/payroll-allowances.schema");
const payroll_ytd_schema_1 = require("../schema/payroll-ytd.schema");
const uuid_1 = require("uuid");
const payroll_run_schema_1 = require("../schema/payroll-run.schema");
const payroll_bonuses_schema_1 = require("../schema/payroll-bonuses.schema");
const pay_groups_schema_1 = require("../schema/pay-groups.schema");
const payroll_settings_service_1 = require("../settings/payroll-settings.service");
const compensation_service_1 = require("../../core/employees/compensation/compensation.service");
const pay_group_allowances_schema_1 = require("../schema/pay-group-allowances.schema");
const date_fns_1 = require("date-fns");
const tax_service_1 = require("../tax/tax.service");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const payslip_service_1 = require("../payslip/payslip.service");
const payslip_schema_1 = require("../schema/payslip.schema");
const workingDays_utils_1 = require("../../../utils/workingDays.utils");
const payroll_adjustments_schema_1 = require("../schema/payroll-adjustments.schema");
const salary_advance_service_1 = require("../salary-advance/salary-advance.service");
const pusher_service_1 = require("../../notification/services/pusher.service");
const email_verification_service_1 = require("../../notification/services/email-verification.service");
const decimal_js_1 = require("decimal.js");
const deduction_schema_1 = require("../schema/deduction.schema");
const salary_advance_schema_1 = require("../salary-advance/schema/salary-advance.schema");
const expense_schema_1 = require("../../expenses/schema/expense.schema");
let RunService = class RunService {
    constructor(payrollQueue, db, auditService, payrollSettingsService, compensationService, taxService, payslipService, salaryAdvanceService, pusher, emailVerificationService) {
        this.payrollQueue = payrollQueue;
        this.db = db;
        this.auditService = auditService;
        this.payrollSettingsService = payrollSettingsService;
        this.compensationService = compensationService;
        this.taxService = taxService;
        this.payslipService = payslipService;
        this.salaryAdvanceService = salaryAdvanceService;
        this.pusher = pusher;
        this.emailVerificationService = emailVerificationService;
    }
    calculatePAYE(annualSalary, pensionDeduction, nhfDeduction, taxRelief) {
        const annual = new decimal_js_1.default(annualSalary);
        const pension = new decimal_js_1.default(pensionDeduction).mul(12);
        const nhf = new decimal_js_1.default(nhfDeduction).mul(12);
        const relief = new decimal_js_1.default(taxRelief);
        const redefinedAnnualSalary = annual.minus(pension).minus(nhf);
        const personalAllowance = relief.plus(redefinedAnnualSalary.mul(0.2));
        const taxableIncome = decimal_js_1.default.max(annual.minus(personalAllowance).minus(pension).minus(nhf), 0);
        const brackets = [
            { limit: new decimal_js_1.default(300_000), rate: 0.07 },
            { limit: new decimal_js_1.default(600_000), rate: 0.11 },
            { limit: new decimal_js_1.default(1_100_000), rate: 0.15 },
            { limit: new decimal_js_1.default(1_600_000), rate: 0.19 },
            { limit: new decimal_js_1.default(3_200_000), rate: 0.21 },
            { limit: new decimal_js_1.default(Infinity), rate: 0.24 },
        ];
        let paye = new decimal_js_1.default(0);
        let remaining = new decimal_js_1.default(taxableIncome);
        let previousLimit = new decimal_js_1.default(0);
        for (const bracket of brackets) {
            if (remaining.lte(0))
                break;
            const range = decimal_js_1.default.min(remaining, bracket.limit.minus(previousLimit));
            paye = paye.plus(range.mul(bracket.rate));
            remaining = remaining.minus(range);
            previousLimit = bracket.limit;
        }
        return {
            paye: paye.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP),
            taxableIncome: taxableIncome.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP),
        };
    }
    percentOf(base, pct) {
        return new decimal_js_1.default(base)
            .mul(pct)
            .div(100)
            .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
    }
    round2(value) {
        return Number(new decimal_js_1.default(value).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP).toFixed(2));
    }
    async calculatePayroll(employeeId, payrollDate, payrollRunId, companyId, userId, workflowId) {
        const payrollMonth = (0, date_fns_1.format)(payrollDate, 'yyyy-MM');
        const employee = await this.compensationService.findAll(employeeId);
        const payrollStart = new Date(`${payrollMonth}-01T00:00:00Z`);
        const payrollEnd = new Date(payrollStart);
        payrollEnd.setMonth(payrollEnd.getMonth() + 1);
        payrollEnd.setDate(0);
        const startDate = payrollStart;
        const endDate = new Date(payrollStart);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const isStarter = new Date(employee.startDate) >= new Date(payrollStart) &&
            new Date(employee.startDate) <= new Date(payrollEnd);
        const [unpaidAdvance, activeDeductions, bonuses, payGroup, payrollSettings, groupRows, adjustments, activeExpenses,] = await Promise.all([
            this.salaryAdvanceService.getUnpaidAdvanceDeductions(employee.employeeId),
            this.db
                .select()
                .from(deduction_schema_1.employeeDeductions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.employeeId, employeeId), (0, drizzle_orm_1.eq)(deduction_schema_1.employeeDeductions.isActive, true), (0, drizzle_orm_1.lte)(deduction_schema_1.employeeDeductions.startDate, payrollDate), (0, drizzle_orm_1.or)((0, drizzle_orm_1.gte)(deduction_schema_1.employeeDeductions.endDate, payrollDate), (0, drizzle_orm_1.isNull)(deduction_schema_1.employeeDeductions.endDate)))),
            this.db
                .select()
                .from(payroll_bonuses_schema_1.payrollBonuses)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_bonuses_schema_1.payrollBonuses.employeeId, employeeId), (0, drizzle_orm_1.gte)(payroll_bonuses_schema_1.payrollBonuses.effectiveDate, startDate.toISOString().slice(0, 10)), (0, drizzle_orm_1.lt)(payroll_bonuses_schema_1.payrollBonuses.effectiveDate, endDate.toISOString().slice(0, 10))))
                .execute(),
            this.db
                .select()
                .from(pay_groups_schema_1.payGroups)
                .where((0, drizzle_orm_1.eq)(pay_groups_schema_1.payGroups.id, employee.payGroupId))
                .execute(),
            this.payrollSettingsService.getAllPayrollSettings(companyId),
            this.db
                .select({
                type: pay_group_allowances_schema_1.payGroupAllowances.allowanceType,
                valueType: pay_group_allowances_schema_1.payGroupAllowances.valueType,
                pct: pay_group_allowances_schema_1.payGroupAllowances.percentage,
                fixed: pay_group_allowances_schema_1.payGroupAllowances.fixedAmount,
            })
                .from(pay_group_allowances_schema_1.payGroupAllowances)
                .where((0, drizzle_orm_1.eq)(pay_group_allowances_schema_1.payGroupAllowances.payGroupId, employee.payGroupId))
                .execute(),
            this.db
                .select()
                .from(payroll_adjustments_schema_1.payrollAdjustments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.employeeId, employeeId), (0, drizzle_orm_1.eq)(payroll_adjustments_schema_1.payrollAdjustments.payrollDate, payrollDate)))
                .execute(),
            this.db
                .select({
                id: expense_schema_1.expenses.id,
                category: expense_schema_1.expenses.category,
                amount: expense_schema_1.expenses.amount,
            })
                .from(expense_schema_1.expenses)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(expense_schema_1.expenses.employeeId, employeeId), (0, drizzle_orm_1.eq)(expense_schema_1.expenses.status, 'pending'), (0, drizzle_orm_1.gte)(expense_schema_1.expenses.submittedAt, startDate), (0, drizzle_orm_1.lte)(expense_schema_1.expenses.submittedAt, endDate))),
        ]);
        const unpaidAdvanceAmount = new decimal_js_1.default(unpaidAdvance?.[0]?.monthlyDeduction || 0);
        const taxableAdjustments = adjustments.filter((a) => a.taxable);
        const nonTaxableAdjustments = adjustments.filter((a) => !a.taxable);
        const totalTaxableAdjustments = taxableAdjustments.reduce((sum, a) => sum.plus(a.amount || 0), new decimal_js_1.default(0));
        const totalBonuses = (bonuses || []).reduce((sum, b) => sum.plus(b.amount || 0), new decimal_js_1.default(0));
        let grossPay = new decimal_js_1.default(employee.grossSalary).div(12);
        if (payrollSettings.enable_proration && isStarter) {
            const joinDate = new Date(employee.startDate);
            const leaveDate = employee.endDate ? new Date(employee.endDate) : null;
            let fromDate = startDate;
            if (joinDate >= startDate && joinDate <= endDate) {
                fromDate = joinDate;
            }
            let toDate = endDate;
            if (leaveDate && leaveDate >= startDate && leaveDate <= endDate) {
                toDate = leaveDate;
            }
            const countDays = (d1, d2) => {
                const MS_PER_DAY = 1000 * 60 * 60 * 24;
                const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
                const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
                return Math.round((utc2 - utc1) / MS_PER_DAY) + 1;
            };
            let daysInPeriod;
            let daysWorked;
            if (payrollSettings.proration_method === 'working_days') {
                daysInPeriod = (0, workingDays_utils_1.countWorkingDays)(startDate, endDate);
                daysWorked = (0, workingDays_utils_1.countWorkingDays)(fromDate, toDate);
            }
            else {
                daysInPeriod = countDays(startDate, endDate);
                daysWorked = countDays(fromDate, toDate);
            }
            grossPay = grossPay.mul(new decimal_js_1.default(daysWorked).div(daysInPeriod));
        }
        const grossSalary = grossPay
            .plus(totalBonuses)
            .plus(totalTaxableAdjustments);
        const globalAllowances = (payrollSettings.allowance_others ?? []);
        const globalRows = globalAllowances.map((a) => ({
            type: a.type,
            valueType: a.fixedAmount != null ? 'fixed' : 'percentage',
            pct: a.percentage != null ? a.percentage : 0,
            fixed: a.fixedAmount != null ? a.fixedAmount : 0,
        }));
        const merged = [
            ...groupRows,
            ...globalRows.filter((g) => !groupRows.some((gr) => gr.type === g.type)),
        ];
        const basicPct = payrollSettings.basic_percent ?? 50;
        const housingPct = payrollSettings.housing_percent ?? 30;
        const transportPct = payrollSettings.transport_percent ?? 20;
        const pctAllowTotal = merged
            .filter((a) => a.valueType === 'percentage')
            .reduce((sum, a) => sum + Number(a.pct), 0);
        const bhtPctTotal = basicPct + housingPct + transportPct;
        if (bhtPctTotal + pctAllowTotal > 100) {
            throw new common_1.BadRequestException(`BHT% (${bhtPctTotal}%) + allowance% (${pctAllowTotal}%) exceed 100%.`);
        }
        const fixedAllowances = merged
            .filter((a) => a.valueType === 'fixed')
            .map((a) => ({ type: a.type, fixed: Number(a.fixed) }));
        const fixedSum = fixedAllowances.reduce((sum, a) => sum.plus(a.fixed), new decimal_js_1.default(0));
        if (fixedSum > grossSalary) {
            throw new common_1.BadRequestException(`Fixed allowances (₦${(fixedSum.toNumber() / 100).toFixed(2)}) exceed gross salary (₦${(grossSalary.toNumber() / 100).toFixed(2)}).`);
        }
        const budget = grossSalary.minus(fixedSum);
        let basicAmt = this.percentOf(budget, payrollSettings.basic_percent);
        const housingAmt = this.percentOf(budget, payrollSettings.housing_percent);
        const transportAmt = this.percentOf(budget, payrollSettings.transport_percent);
        const pctAllowances = merged
            .filter((a) => a.valueType === 'percentage')
            .map((a) => ({
            type: a.type,
            amount: new decimal_js_1.default(a.pct ?? 0)
                .div(100)
                .mul(budget)
                .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP),
        }));
        merged.sort((a, b) => a.type.localeCompare(b.type));
        const payrollAllowancesData = [
            ...fixedAllowances.map((a) => ({
                allowanceType: a.type,
                allowanceAmount: a.fixed,
            })),
            ...pctAllowances.map((a) => ({
                allowanceType: a.type,
                allowanceAmount: a.amount,
            })),
        ];
        const sumBHT = basicAmt.plus(housingAmt).plus(transportAmt);
        const sumPct = pctAllowances.reduce((s, a) => s.plus(a.amount), new decimal_js_1.default(0));
        const sumFixed = fixedSum;
        const totalUsed = sumBHT
            .plus(new decimal_js_1.default(sumPct))
            .plus(new decimal_js_1.default(sumFixed));
        const diff = grossSalary.minus(totalUsed);
        basicAmt = basicAmt.plus(diff);
        const payGroupSettings = payGroup[0] || {};
        const relief = payrollSettings.default_tax_relief ?? 200000;
        const bhtTotal = basicAmt.plus(housingAmt).plus(transportAmt);
        const empPct = new decimal_js_1.default(payrollSettings.default_pension_employee_percent || 8);
        const erPct = new decimal_js_1.default(payrollSettings.default_pension_employer_percent || 10);
        const nhfPct = new decimal_js_1.default(payrollSettings.nhf_percent || 2.5);
        const applyPension = Boolean(payGroupSettings.applyPension ?? payrollSettings.apply_pension ?? false);
        const applyNHF = Boolean((payGroupSettings.applyNhf ?? payrollSettings.apply_nhf ?? false) &&
            employee.applyNhf);
        const employeePensionContribution = applyPension
            ? this.percentOf(bhtTotal, empPct)
            : new decimal_js_1.default(0);
        const employerPensionContribution = applyPension
            ? this.percentOf(bhtTotal, erPct)
            : new decimal_js_1.default(0);
        const nhfContribution = applyNHF
            ? this.percentOf(basicAmt, nhfPct)
            : new decimal_js_1.default(0);
        const annualizedGross = grossSalary.mul(12);
        const { paye, taxableIncome } = this.calculatePAYE(annualizedGross, employeePensionContribution, nhfContribution, new decimal_js_1.default(relief));
        const payeDec = new decimal_js_1.default(paye);
        const taxableIncomeDec = new decimal_js_1.default(taxableIncome);
        const monthlyPAYE = payeDec
            .div(12)
            .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const monthlyTaxableIncome = taxableIncomeDec
            .div(12)
            .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const deductionBreakdown = [];
        const totalPostTaxDeductions = (activeDeductions || []).reduce((sum, deduction) => {
            const value = deduction.rateType === 'percentage'
                ? grossSalary.mul(new decimal_js_1.default(deduction.rateValue)).div(100)
                : new decimal_js_1.default(deduction.rateValue);
            deductionBreakdown.push({
                typeId: deduction.deductionTypeId,
                amount: value.toFixed(2),
            });
            return sum.plus(value);
        }, new decimal_js_1.default(0));
        const totalNonTaxable = nonTaxableAdjustments.reduce((sum, a) => sum.plus(a.amount || 0), new decimal_js_1.default(0));
        const reimbursedTotal = activeExpenses.reduce((sum, expense) => sum.plus(new decimal_js_1.default(expense.amount || 0)), new decimal_js_1.default(0));
        const reimbursedExpenses = activeExpenses.map((expense) => ({
            id: expense.id,
            expenseName: expense.category,
            amount: new decimal_js_1.default(expense.amount || 0).toFixed(2),
        }));
        const totalDeductions = new decimal_js_1.default(monthlyPAYE)
            .plus(employeePensionContribution)
            .plus(nhfContribution)
            .plus(totalPostTaxDeductions);
        const netSalary = decimal_js_1.default.max(new decimal_js_1.default(grossSalary)
            .plus(totalNonTaxable)
            .plus(reimbursedTotal)
            .minus(unpaidAdvanceAmount)
            .minus(totalDeductions), 0).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const savedPayroll = await this.db.transaction(async (trx) => {
            const multi = payrollSettings.multi_level_approval;
            const approvalStatus = multi ? 'pending' : 'approved';
            const approvalDate = multi ? null : new Date().toISOString();
            const approvalRemarks = multi ? null : 'Auto-approved';
            await trx
                .delete(payroll_run_schema_1.payroll)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, employeeId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollDate, payrollDate), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId)))
                .execute();
            await trx
                .delete(payroll_ytd_schema_1.payrollYtd)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.employeeId, employeeId), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.payrollDate, payrollDate), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId)))
                .execute();
            await trx
                .delete(payroll_allowances_schema_1.payrollAllowances)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_allowances_schema_1.payrollAllowances.payrollId, payrollRunId), (0, drizzle_orm_1.eq)(payroll_allowances_schema_1.payrollAllowances.employeeId, employeeId)))
                .execute();
            const [inserted] = await trx
                .insert(payroll_run_schema_1.payroll)
                .values({
                payrollRunId,
                employeeId,
                companyId,
                basic: basicAmt.toFixed(2),
                housing: housingAmt.toFixed(2),
                transport: transportAmt.toFixed(2),
                grossSalary: grossSalary.toFixed(2),
                pensionContribution: employeePensionContribution.toFixed(2),
                employerPensionContribution: employerPensionContribution.toFixed(2),
                bonuses: totalBonuses.toFixed(2),
                nhfContribution: nhfContribution.toFixed(2),
                payeTax: monthlyPAYE.toFixed(2),
                voluntaryDeductions: deductionBreakdown,
                totalDeductions: totalDeductions.toFixed(2),
                taxableIncome: monthlyTaxableIncome.toFixed(2),
                netSalary: netSalary.toFixed(2),
                salaryAdvance: unpaidAdvanceAmount.toFixed(2),
                reimbursements: reimbursedExpenses,
                payrollDate,
                payrollMonth,
                approvalStatus: approvalStatus,
                approvalDate,
                approvalRemarks: approvalRemarks,
                requestedBy: userId,
                workflowId: workflowId,
                currentStep: multi ? 0 : 1,
                isStarter: isStarter ? true : false,
            })
                .returning()
                .execute();
            const [emp] = await trx
                .select({
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, inserted.employeeId))
                .execute();
            await trx
                .insert(payroll_ytd_schema_1.payrollYtd)
                .values({
                employeeId,
                payrollMonth,
                payrollDate,
                payrollId: inserted.id,
                companyId,
                year: new Date().getFullYear(),
                grossSalary: grossSalary.toFixed(2),
                netSalary: netSalary.toFixed(2),
                totalDeductions: totalDeductions.toFixed(2),
                bonuses: totalBonuses.toFixed(2),
                PAYE: monthlyPAYE.toFixed(2),
                pension: employeePensionContribution.toFixed(2),
                employerPension: employerPensionContribution.toFixed(2),
                nhf: nhfContribution.toFixed(2),
                basic: basicAmt.toFixed(2),
                housing: housingAmt.toFixed(2),
                transport: transportAmt.toFixed(2),
            })
                .execute();
            if (payrollAllowancesData.length > 0) {
                await trx
                    .insert(payroll_allowances_schema_1.payrollAllowances)
                    .values(payrollAllowancesData.map((a) => ({
                    payrollId: inserted.payrollRunId,
                    allowance_type: a.allowanceType,
                    allowanceAmount: new decimal_js_1.default(a.allowanceAmount).toFixed(2),
                    employeeId: inserted.employeeId,
                })))
                    .execute();
            }
            return {
                ...inserted,
                name: `${emp.firstName} ${emp.lastName}`,
            };
        });
        return savedPayroll;
    }
    async calculatePayrollForCompany(user, payrollDate, groupId) {
        const companyId = user.companyId;
        const baseConditions = [(0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId)];
        if (groupId)
            baseConditions.push((0, drizzle_orm_1.eq)(schema_1.employees.payGroupId, groupId));
        const allEmployees = await this.db
            .select({
            id: schema_1.employees.id,
            employmentStatus: schema_1.employees.employmentStatus,
        })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)(...baseConditions))
            .execute();
        const employeesList = allEmployees.filter((e) => e.employmentStatus === 'active');
        if (employeesList.length === 0) {
            throw new common_1.BadRequestException(`No active employees found for company ${companyId}${groupId ? ` in group ${groupId}` : ''}`);
        }
        const payrollSettings = await this.payrollSettingsService.getAllPayrollSettings(companyId);
        const multi = payrollSettings.multi_level_approval;
        const chain = payrollSettings.approver_chain || '[]';
        const [existingRun] = await this.db
            .select()
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollDate, payrollDate)))
            .execute();
        const payrollRunId = existingRun?.payrollRunId ?? (0, uuid_1.v4)();
        let [workflow] = await this.db
            .select()
            .from(schema_1.approvalWorkflows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, payrollRunId), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityDate, payrollDate)))
            .execute();
        if (!workflow) {
            [workflow] = await this.db
                .insert(schema_1.approvalWorkflows)
                .values({
                name: 'Payroll Run',
                companyId,
                entityId: payrollRunId,
                entityDate: payrollDate,
            })
                .returning()
                .execute();
        }
        const workflowId = workflow.id;
        const existingSteps = await this.db
            .select()
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId))
            .execute();
        if (existingSteps.length === 0) {
            const steps = multi
                ? chain.reverse().map((role, idx) => ({
                    workflowId,
                    sequence: idx + 1,
                    role,
                    minApprovals: 1,
                    maxApprovals: 1,
                    createdAt: new Date(),
                }))
                : [
                    {
                        workflowId,
                        sequence: 1,
                        role: payrollSettings.approver ?? 'payroll_specialist',
                        status: 'approved',
                        minApprovals: 1,
                        maxApprovals: 1,
                        createdAt: new Date(),
                    },
                ];
            const createdSteps = await this.db
                .insert(schema_1.approvalSteps)
                .values(steps)
                .returning({
                id: schema_1.approvalSteps.id,
            })
                .execute();
            await this.db
                .insert(payroll_run_schema_1.payrollApprovals)
                .values(employeesList.map(() => ({
                payrollRunId,
                stepId: createdSteps[0].id,
                actorId: user.id,
                action: 'pending',
                remarks: 'Pending approval',
                createdAt: new Date(),
            })))
                .execute();
        }
        if (!multi) {
            const [step] = await this.db
                .select()
                .from(schema_1.approvalSteps)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId), (0, drizzle_orm_1.eq)(schema_1.approvalSteps.sequence, 1)))
                .execute();
            if (step) {
                await this.db
                    .insert(payroll_run_schema_1.payrollApprovals)
                    .values({
                    payrollRunId,
                    stepId: step.id,
                    actorId: user.id,
                    action: 'approved',
                    remarks: 'Auto-approved',
                    createdAt: new Date(),
                })
                    .execute();
            }
        }
        const payrollResults = await (0, p_map_1.default)(employeesList, async (employee) => {
            return this.calculatePayroll(employee.id, payrollDate, payrollRunId, companyId, user.id, workflowId);
        }, { concurrency: 10 });
        if (!multi) {
            await this.payslipService.generatePayslipsForCompany(companyId, payrollResults[0].payrollMonth);
        }
        return payrollResults;
    }
    async findOnePayRun(runId) {
        const exists = await this.db
            .select()
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .execute();
        if (!exists.length) {
            throw new common_1.BadRequestException(`Payroll run ${runId} not found`);
        }
        const rows = await this.db
            .select({
            employeeId: payroll_run_schema_1.payroll.employeeId,
            grossSalary: payroll_run_schema_1.payroll.grossSalary,
            netSalary: payroll_run_schema_1.payroll.netSalary,
            payeTax: payroll_run_schema_1.payroll.payeTax,
            pensionContribution: payroll_run_schema_1.payroll.pensionContribution,
            employerPensionContribution: payroll_run_schema_1.payroll.employerPensionContribution,
            nhfContribution: payroll_run_schema_1.payroll.nhfContribution,
            approvalStatus: payroll_run_schema_1.payroll.approvalStatus,
            paymentStatus: payroll_run_schema_1.payroll.paymentStatus,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            additionalDeductions: payroll_run_schema_1.payroll.customDeductions,
            taxableIncome: payroll_run_schema_1.payroll.taxableIncome,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
            bonuses: payroll_run_schema_1.payroll.bonuses,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
            payslip_pdf_url: payslip_schema_1.paySlips.pdfUrl,
            reimbursements: payroll_run_schema_1.payroll.reimbursements,
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .leftJoin(payslip_schema_1.paySlips, (0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollId, payroll_run_schema_1.payroll.id))
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .execute();
        const totalCostOfPayroll = rows.reduce((sum, r) => {
            const grossSalary = Number(r.grossSalary);
            const employerPension = Number(r.employerPensionContribution);
            const reimbursementsArray = Array.isArray(r.reimbursements)
                ? r.reimbursements
                : [];
            const reimbursementTotal = reimbursementsArray.reduce((acc, item) => {
                return acc + Number(item.amount || 0);
            }, 0);
            return sum + grossSalary + employerPension + reimbursementTotal;
        }, 0);
        const totalPensionContribution = rows.reduce((sum, r) => sum + Number(r.pensionContribution), 0);
        const totalPAYE = rows.reduce((sum, r) => sum + Number(r.payeTax), 0);
        const totalNHFContribution = rows.reduce((sum, r) => sum + Number(r.nhfContribution), 0);
        const employeesDto = rows.map((r) => ({
            employeeId: r.employeeId,
            name: `${r.firstName} ${r.lastName}`,
            grossSalary: Number(r.grossSalary),
            netSalary: Number(r.netSalary),
            approvalStatus: r.approvalStatus,
            paymentStatus: r.paymentStatus,
            payeTax: Number(r.payeTax),
            pensionContribution: Number(r.pensionContribution),
            nhfContribution: Number(r.nhfContribution),
            employerPensionContribution: Number(r.employerPensionContribution),
            additionalDeductions: Number(r.additionalDeductions),
            taxableIncome: Number(r.taxableIncome),
            salaryAdvance: Number(r.salaryAdvance),
            payrollMonth: r.payrollMonth,
            payrollRunId: r.payrollRunId,
            payrollDate: r.payrollDate,
            bonuses: Number(r.bonuses),
            voluntaryDeductions: r.voluntaryDeductions,
            payslip_pdf_url: r.payslip_pdf_url,
            reimbursements: r.reimbursements,
        }));
        return {
            totalCostOfPayroll,
            totalPensionContribution,
            totalPAYE,
            totalNHFContribution,
            payrollRunId: rows[0].payrollRunId,
            employees: employeesDto,
        };
    }
    async sendForApproval(runId, actorId, remarks) {
        const existing = await this.db
            .select()
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .limit(1)
            .execute();
        if (existing.length === 0) {
            throw new common_1.NotFoundException(`No payroll found for run ${runId}`);
        }
        if (existing[0].approvalStatus === 'submitted') {
            throw new common_1.BadRequestException(`Payroll run already submitted on ${existing[0].lastApprovalAt}`);
        }
        if (existing[0].approvalStatus === 'approved') {
            throw new common_1.BadRequestException(`Payroll run already approved on ${existing[0].approvalDate}`);
        }
        const now = new Date();
        const { numUpdatedRows } = await this.db
            .update(payroll_run_schema_1.payroll)
            .set({
            approvalStatus: 'submitted',
            lastApprovalAt: now,
            lastApprovedBy: actorId,
        })
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .execute();
        await this.db
            .update(payroll_run_schema_1.payrollApprovals)
            .set({
            action: 'submitted',
            remarks: remarks ?? '',
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payrollApprovals.payrollRunId, existing[0].id), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payrollApprovals.actorId, actorId)))
            .execute();
        const payrollSettings = await this.payrollSettingsService.getAllPayrollSettings(existing[0].companyId);
        let approverList = [];
        let approverRole = null;
        if (payrollSettings.multi_level_approval) {
            approverList = payrollSettings.approver_chain?.slice().reverse() || [];
            approverRole = approverList[0];
        }
        else {
            approverRole = payrollSettings.approver;
        }
        const [currentUserForApproval] = await this.db
            .select({
            id: schema_1.users.id,
            role: schema_1.companyRoles.name,
            email: schema_1.users.email,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, existing[0].companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, approverRole)));
        await this.emailVerificationService.sendVerifyEmail(currentUserForApproval.email, 'Payroll Run Approval');
        return { updatedCount: numUpdatedRows };
    }
    async approvePayrollRun(runId, user, remarks) {
        const [payrollRow] = await this.db
            .select({
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            workflowId: payroll_run_schema_1.payroll.workflowId,
            approvalStatus: payroll_run_schema_1.payroll.approvalStatus,
            approvalDate: payroll_run_schema_1.payroll.approvalDate,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .limit(1)
            .execute();
        if (!payrollRow) {
            throw new common_1.NotFoundException(`No payroll found for run ${runId}`);
        }
        if (payrollRow.approvalStatus === 'approved') {
            throw new common_1.BadRequestException(`Payroll run already approved on ${payrollRow.approvalDate}`);
        }
        const steps = await this.db
            .select({
            id: schema_1.approvalSteps.id,
            sequence: schema_1.approvalSteps.sequence,
            role: schema_1.approvalSteps.role,
            status: schema_1.approvalSteps.status,
        })
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, payrollRow.workflowId))
            .orderBy(schema_1.approvalSteps.sequence)
            .execute();
        if (steps.length === 0) {
            throw new common_1.BadRequestException(`No approval steps configured`);
        }
        const currentStep = steps.find((s) => s.status === 'pending');
        if (!currentStep) {
            throw new common_1.BadRequestException(`No pending steps left to approve`);
        }
        const payrollSettings = await this.payrollSettingsService.getAllPayrollSettings(user.companyId);
        const fallbackRoles = payrollSettings.approval_fallback || '[]';
        const isFallback = fallbackRoles.includes(user.role);
        const actorRole = currentStep.role;
        if (actorRole !== user.role && !isFallback) {
            throw new common_1.BadRequestException(`Actor ${user.role} does not have permission to approve this step`);
        }
        await this.db
            .update(schema_1.approvalSteps)
            .set({ status: 'approved' })
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.id, currentStep.id))
            .execute();
        await this.db.insert(payroll_run_schema_1.payrollApprovals).values({
            payrollRunId: runId,
            actorId: user.id,
            action: 'approved',
            remarks: remarks ?? '',
            stepId: currentStep.id,
        });
        const allApproved = steps.every((s) => s.id === currentStep.id || s.status === 'approved');
        if (allApproved) {
            const now = new Date();
            const result = await this.db
                .update(payroll_run_schema_1.payroll)
                .set({
                approvalStatus: 'approved',
                approvalDate: now.toDateString(),
                lastApprovalAt: now,
                lastApprovedBy: user.id,
            })
                .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
                .returning({
                payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            })
                .execute();
            await this.payslipService.generatePayslipsForCompany(user.companyId, result[0].payrollMonth);
        }
        return 'Payroll run approved successfully';
    }
    async checkApprovalStatus(runId) {
        const [payrollRow] = await this.db
            .select({
            workflowId: payroll_run_schema_1.payroll.workflowId,
            approvalStatus: payroll_run_schema_1.payroll.approvalStatus,
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .limit(1)
            .execute();
        if (!payrollRow) {
            throw new common_1.NotFoundException(`No payroll found for run ${runId}`);
        }
        const steps = await this.db
            .select({
            id: schema_1.approvalSteps.id,
            sequence: schema_1.approvalSteps.sequence,
            role: schema_1.approvalSteps.role,
            minApprovals: schema_1.approvalSteps.minApprovals,
            maxApprovals: schema_1.approvalSteps.maxApprovals,
            createdAt: schema_1.approvalSteps.createdAt,
            status: schema_1.approvalSteps.status,
        })
            .from(schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, payrollRow.workflowId))
            .orderBy(schema_1.approvalSteps.sequence)
            .execute();
        return {
            payrollDate: payrollRow.payrollDate,
            approvalStatus: payrollRow.approvalStatus,
            approvalSteps: steps,
        };
    }
    async markAsInProgress(runId, user) {
        const [payrollRow] = await this.db
            .select()
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .limit(1)
            .execute();
        if (!payrollRow) {
            throw new common_1.NotFoundException(`No payroll found for run ${runId}`);
        }
        await this.db
            .update(payroll_run_schema_1.payroll)
            .set({ paymentStatus: 'in-progress', approvalStatus: 'completed' })
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .execute();
        await this.auditService.logAction({
            userId: user.id,
            action: 'create',
            details: 'Payroll run marked as in-progress',
            entityId: runId,
            entity: 'payroll_run',
            changes: {
                payrollRunId: runId,
                status: 'in-progress',
                updatedBy: user.id,
            },
        });
    }
    async updatePayrollPaymentStatus(user, payrollRunId, paymentStatus) {
        const result = await this.db
            .update(payroll_run_schema_1.payroll)
            .set({
            paymentStatus,
            paymentDate: new Date().toISOString().split('T')[0],
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, user.companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, payrollRunId)))
            .returning({
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            employeeId: payroll_run_schema_1.payroll.employeeId,
            expenses: payroll_run_schema_1.payroll.reimbursements,
        })
            .execute();
        for (const entry of result) {
            if (entry.salaryAdvance !== null && Number(entry.salaryAdvance) > 0) {
                const [advance] = await this.db
                    .select()
                    .from(salary_advance_schema_1.salaryAdvance)
                    .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, entry.employeeId))
                    .limit(1)
                    .execute();
                await this.salaryAdvanceService.repayAdvance(advance.id, Number(advance.preferredMonthlyPayment));
            }
        }
        const expenseIds = result.flatMap((r) => {
            if (!r.expenses)
                return [];
            return r.expenses.map((e) => typeof e === 'object' && e !== null && 'id' in e ? e.id : e);
        });
        if (expenseIds.length > 0) {
            await this.db
                .update(expense_schema_1.expenses)
                .set({ status: 'paid' })
                .where((0, drizzle_orm_1.inArray)(expense_schema_1.expenses.id, expenseIds))
                .execute();
        }
        await this.taxService.onPayrollApproval(user.companyId, result[0].payrollMonth, payrollRunId);
        const getPayslips = await this.db
            .select()
            .from(payslip_schema_1.paySlips)
            .where((0, drizzle_orm_1.eq)(payslip_schema_1.paySlips.payrollMonth, result[0].payrollMonth))
            .execute();
        for (const payslip of getPayslips) {
            await this.payrollQueue.add('generatePayslipPdf', {
                payslipId: payslip.id,
            }, { delay: 3000 });
        }
        await this.auditService.logAction({
            userId: user.id,
            action: 'update',
            details: 'Payroll run payment status updated',
            entityId: payrollRunId,
            entity: 'payroll_run',
            changes: {
                payrollRunId,
                status: paymentStatus,
                updatedBy: user.id,
            },
        });
        return result;
    }
};
exports.RunService = RunService;
exports.RunService = RunService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_2.InjectQueue)('payrollQueue')),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [bullmq_1.Queue, Object, audit_service_1.AuditService,
        payroll_settings_service_1.PayrollSettingsService,
        compensation_service_1.CompensationService,
        tax_service_1.TaxService,
        payslip_service_1.PayslipService,
        salary_advance_service_1.SalaryAdvanceService,
        pusher_service_1.PusherService,
        email_verification_service_1.EmailVerificationService])
], RunService);
//# sourceMappingURL=run.service.js.map