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
const payroll_settings_service_1 = require("../settings/payroll-settings.service");
const compensation_service_1 = require("../../core/employees/compensation/compensation.service");
const date_fns_1 = require("date-fns");
const tax_service_1 = require("../tax/tax.service");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const payslip_service_1 = require("../payslip/payslip.service");
const payslip_schema_1 = require("../schema/payslip.schema");
const workingDays_utils_1 = require("../../../utils/workingDays.utils");
const salary_advance_service_1 = require("../salary-advance/salary-advance.service");
const pusher_service_1 = require("../../notification/services/pusher.service");
const decimal_js_1 = require("decimal.js");
const salary_advance_schema_1 = require("../salary-advance/schema/salary-advance.schema");
const expense_schema_1 = require("../../expenses/schema/expense.schema");
const payroll_approval_service_1 = require("../../notification/services/payroll-approval.service");
const config_1 = require("@nestjs/config");
const hot_queries_1 = require("../../../drizzle/hot-queries");
const D_ZERO = new decimal_js_1.default(0);
const D_RENT_RELIEF = new decimal_js_1.default(200_000);
const D_RATE_000 = new decimal_js_1.default(0);
const D_RATE_015 = new decimal_js_1.default(0.15);
const D_RATE_018 = new decimal_js_1.default(0.18);
const D_RATE_021 = new decimal_js_1.default(0.21);
const D_RATE_023 = new decimal_js_1.default(0.23);
const D_RATE_025 = new decimal_js_1.default(0.25);
const BRACKETS = [
    { limit: new decimal_js_1.default(800_000), rate: D_RATE_000 },
    { limit: new decimal_js_1.default(2_200_000), rate: D_RATE_015 },
    { limit: new decimal_js_1.default(9_000_000), rate: D_RATE_018 },
    { limit: new decimal_js_1.default(13_000_000), rate: D_RATE_021 },
    { limit: new decimal_js_1.default(25_000_000), rate: D_RATE_023 },
    { limit: new decimal_js_1.default(50_000_000), rate: D_RATE_025 },
    { limit: new decimal_js_1.default(Infinity), rate: D_RATE_025 },
];
const D_HUNDRED = new decimal_js_1.default(100);
const toDec = (v) => v instanceof decimal_js_1.default ? v : new decimal_js_1.default(v);
let RunService = class RunService {
    constructor(payrollQueue, db, hot, auditService, payrollSettingsService, compensationService, taxService, payslipService, salaryAdvanceService, pusher, payrollApprovalEmailService, configService) {
        this.payrollQueue = payrollQueue;
        this.db = db;
        this.hot = hot;
        this.auditService = auditService;
        this.payrollSettingsService = payrollSettingsService;
        this.compensationService = compensationService;
        this.taxService = taxService;
        this.payslipService = payslipService;
        this.salaryAdvanceService = salaryAdvanceService;
        this.pusher = pusher;
        this.payrollApprovalEmailService = payrollApprovalEmailService;
        this.configService = configService;
    }
    calculatePAYE(annualSalary, pensionDeduction, nhfDeduction) {
        const annual = new decimal_js_1.default(annualSalary);
        const pension = new decimal_js_1.default(pensionDeduction).mul(12);
        const nhf = new decimal_js_1.default(nhfDeduction).mul(12);
        const redefinedAnnualSalary = annual.minus(pension).minus(nhf);
        const taxableIncome = decimal_js_1.default.max(redefinedAnnualSalary.minus(D_RENT_RELIEF), D_ZERO);
        let paye = D_ZERO;
        let remaining = taxableIncome;
        let previousLimit = D_ZERO;
        for (let i = 0; i < BRACKETS.length && remaining.gt(D_ZERO); i++) {
            const { limit, rate } = BRACKETS[i];
            const span = limit.minus(previousLimit);
            const range = remaining.lt(span) ? remaining : span;
            if (range.lte(D_ZERO))
                break;
            paye = paye.plus(range.mul(rate));
            remaining = remaining.minus(range);
            previousLimit = limit;
        }
        return {
            paye: paye.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP),
            taxableIncome: taxableIncome.toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP),
        };
    }
    percentOf(base, pct) {
        return toDec(base)
            .mul(toDec(pct))
            .div(D_HUNDRED)
            .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
    }
    round2(value) {
        return Number(toDec(value).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP).toFixed(2));
    }
    async calculatePayroll(employeeId, payrollDate, payrollRunId, companyId, userId, workflowId) {
        const payrollMonth = (0, date_fns_1.format)(payrollDate, 'yyyy-MM');
        const employee = await this.compensationService.findAll(employeeId);
        const payrollStart = new Date(`${payrollMonth}-01T00:00:00Z`);
        const startDate = payrollStart;
        const endDate = new Date(payrollStart);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const startISO = startDate.toISOString().slice(0, 10);
        const endISO = endDate.toISOString().slice(0, 10);
        const isStarter = new Date(employee.startDate) >= startDate &&
            new Date(employee.startDate) <= endDate;
        const [unpaidAdvance, activeDeductions, bonuses, payGroupRow, payrollSettings, groupRows, adjustments, activeExpenses,] = await Promise.all([
            this.salaryAdvanceService.getUnpaidAdvanceDeductions(employee.employeeId),
            this.hot.activeDeductions(employeeId, payrollDate),
            this.hot.bonusesByRange(employeeId, startISO, endISO),
            this.hot.payGroupById(employee.payGroupId),
            this.payrollSettingsService.getAllPayrollSettings(companyId),
            this.hot.groupAllowances(employee.payGroupId),
            this.hot.adjustmentsByDate(companyId, employeeId, payrollDate),
            this.hot.expensesByRange(employeeId, startISO, endISO),
        ]);
        const unpaidAdvanceAmount = toDec(unpaidAdvance?.[0]?.monthlyDeduction || 0);
        const taxableAdjustments = adjustments.filter((a) => a.taxable);
        const nonTaxableAdjustments = adjustments.filter((a) => !a.taxable);
        const D_ZERO = new decimal_js_1.default(0);
        const D_HUNDRED = new decimal_js_1.default(100);
        const totalBonuses = (bonuses || []).reduce((sum, b) => sum.plus(toDec(b.amount ?? b.amount_value ?? 0)), D_ZERO);
        const totalTaxableAdjustments = taxableAdjustments.reduce((sum, a) => sum.plus(toDec(a.amount ?? 0)), D_ZERO);
        let grossPay = toDec(employee.grossSalary).div(12);
        if (payrollSettings.enable_proration && isStarter) {
            const joinDate = new Date(employee.startDate);
            const leaveDate = employee.endDate ? new Date(employee.endDate) : null;
            let fromDate = startDate;
            if (joinDate >= startDate && joinDate <= endDate)
                fromDate = joinDate;
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
            grossPay = grossPay.mul(toDec(daysWorked).div(daysInPeriod));
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
        const fixedSum = fixedAllowances.reduce((sum, a) => sum.plus(a.fixed), D_ZERO);
        if (fixedSum.gt(grossSalary)) {
            throw new common_1.BadRequestException(`Fixed allowances (₦${(fixedSum.toNumber() / 100).toFixed(2)}) exceed gross salary (₦${(grossSalary.toNumber() / 100).toFixed(2)}).`);
        }
        const budget = grossSalary.minus(fixedSum);
        const percentOf = (base, pct) => new decimal_js_1.default(base)
            .mul(pct)
            .div(100)
            .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        let basicAmt = percentOf(budget, basicPct);
        const housingAmt = percentOf(budget, housingPct);
        const transportAmt = percentOf(budget, transportPct);
        const pctAllowances = merged
            .filter((a) => a.valueType === 'percentage')
            .map((a) => ({
            type: a.type,
            amount: toDec(a.pct ?? 0)
                .div(D_HUNDRED)
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
        const sumPct = pctAllowances.reduce((s, a) => s.plus(a.amount), D_ZERO);
        const totalUsed = sumBHT.plus(sumPct).plus(fixedSum);
        const diff = grossSalary.minus(totalUsed);
        basicAmt = basicAmt.plus(diff);
        const payGroupSettings = payGroupRow || {};
        const bhtTotal = basicAmt.plus(housingAmt).plus(transportAmt);
        const empPct = toDec(payrollSettings.default_pension_employee_percent || 8);
        const erPct = toDec(payrollSettings.default_pension_employer_percent || 10);
        const nhfPct = toDec(payrollSettings.nhf_percent || 2.5);
        const applyPension = Boolean(payGroupSettings.applyPension ?? payrollSettings.apply_pension ?? false);
        const applyNHF = Boolean((payGroupSettings.applyNhf ?? payrollSettings.apply_nhf ?? false) &&
            employee.applyNhf);
        const employeePensionContribution = applyPension
            ? percentOf(bhtTotal, empPct)
            : D_ZERO;
        const employerPensionContribution = applyPension
            ? percentOf(bhtTotal, erPct)
            : D_ZERO;
        const nhfContribution = applyNHF ? percentOf(basicAmt, nhfPct) : D_ZERO;
        const annualizedGross = grossSalary.mul(12);
        const applyPAYE = payrollSettings.apply_paye ?? true;
        let monthlyPAYE = D_ZERO;
        let monthlyTaxableIncome = D_ZERO;
        if (applyPAYE) {
            const { paye, taxableIncome } = this.calculatePAYE(annualizedGross, employeePensionContribution, nhfContribution);
            monthlyPAYE = toDec(paye)
                .div(12)
                .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
            monthlyTaxableIncome = toDec(taxableIncome)
                .div(12)
                .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        }
        const deductionBreakdown = [];
        const totalPostTaxDeductions = (activeDeductions || []).reduce((sum, d) => {
            const rateType = d.rateType ?? d.rate_type ?? 'fixed';
            const rateValue = toDec(d.rateValue ?? d.rate_value ?? 0);
            const typeId = d.deductionTypeId ?? d.deduction_type_id ?? d.deduction_type ?? '';
            const value = rateType === 'percentage'
                ? grossSalary.mul(rateValue).div(D_HUNDRED)
                : rateValue;
            deductionBreakdown.push({
                typeId,
                amount: value.toFixed(2),
            });
            return sum.plus(value);
        }, D_ZERO);
        const totalNonTaxable = nonTaxableAdjustments.reduce((sum, a) => sum.plus(a.amount || 0), D_ZERO);
        const reimbursedTotal = activeExpenses.reduce((sum, expense) => sum.plus(toDec(expense.amount || 0)), D_ZERO);
        const reimbursedExpenses = activeExpenses.map((expense) => ({
            id: expense.id,
            expenseName: expense.category,
            amount: toDec(expense.amount || 0).toFixed(2),
        }));
        const totalDeductions = monthlyPAYE
            .plus(employeePensionContribution)
            .plus(nhfContribution)
            .plus(totalPostTaxDeductions);
        const netSalary = decimal_js_1.default.max(grossSalary
            .plus(totalBonuses)
            .plus(totalNonTaxable)
            .plus(reimbursedTotal)
            .minus(unpaidAdvanceAmount)
            .minus(totalDeductions), D_ZERO).toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP);
        const savedPayroll = await this.db.transaction(async (trx) => {
            const multi = payrollSettings.multi_level_approval;
            const approvalStatus = multi ? 'pending' : 'approved';
            const approvalDate = multi ? null : new Date().toISOString();
            const approvalRemarks = multi ? null : 'Auto-approved';
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
                approvalStatus,
                approvalDate,
                approvalRemarks,
                requestedBy: userId,
                workflowId,
                currentStep: multi ? 0 : 1,
                isStarter: !!isStarter,
                updatedAt: new Date(),
            })
                .onConflictDoUpdate({
                target: [payroll_run_schema_1.payroll.employeeId, payroll_run_schema_1.payroll.payrollDate, payroll_run_schema_1.payroll.companyId],
                set: {
                    payrollRunId: (0, drizzle_orm_1.sql) `EXCLUDED.payroll_run_id`,
                    basic: (0, drizzle_orm_1.sql) `EXCLUDED.basic`,
                    housing: (0, drizzle_orm_1.sql) `EXCLUDED.housing`,
                    transport: (0, drizzle_orm_1.sql) `EXCLUDED.transport`,
                    grossSalary: (0, drizzle_orm_1.sql) `EXCLUDED.gross_salary`,
                    pensionContribution: (0, drizzle_orm_1.sql) `EXCLUDED.pension_contribution`,
                    employerPensionContribution: (0, drizzle_orm_1.sql) `EXCLUDED.employer_pension_contribution`,
                    bonuses: (0, drizzle_orm_1.sql) `EXCLUDED.bonuses`,
                    nhfContribution: (0, drizzle_orm_1.sql) `EXCLUDED.nhf_contribution`,
                    payeTax: (0, drizzle_orm_1.sql) `EXCLUDED.paye_tax`,
                    voluntaryDeductions: (0, drizzle_orm_1.sql) `EXCLUDED.voluntary_deductions`,
                    totalDeductions: (0, drizzle_orm_1.sql) `EXCLUDED.total_deductions`,
                    taxableIncome: (0, drizzle_orm_1.sql) `EXCLUDED.taxable_income`,
                    netSalary: (0, drizzle_orm_1.sql) `EXCLUDED.net_salary`,
                    salaryAdvance: (0, drizzle_orm_1.sql) `EXCLUDED.salary_advance`,
                    reimbursements: (0, drizzle_orm_1.sql) `EXCLUDED.reimbursements`,
                    approvalStatus: (0, drizzle_orm_1.sql) `EXCLUDED.approval_status`,
                    approvalDate: (0, drizzle_orm_1.sql) `EXCLUDED.approval_date`,
                    approvalRemarks: (0, drizzle_orm_1.sql) `EXCLUDED.approval_remarks`,
                    requestedBy: (0, drizzle_orm_1.sql) `EXCLUDED.requested_by`,
                    workflowId: (0, drizzle_orm_1.sql) `EXCLUDED.workflow_id`,
                    currentStep: (0, drizzle_orm_1.sql) `EXCLUDED.current_step`,
                    isStarter: (0, drizzle_orm_1.sql) `EXCLUDED.is_starter`,
                    updatedAt: (0, drizzle_orm_1.sql) `now()`,
                    payrollMonth: (0, drizzle_orm_1.sql) `EXCLUDED.payroll_month`,
                },
            })
                .returning()
                .execute();
            await trx
                .delete(payroll_ytd_schema_1.payrollYtd)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.employeeId, employeeId), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.payrollDate, payrollDate), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId)))
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
            await trx
                .delete(payroll_allowances_schema_1.payrollAllowances)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_allowances_schema_1.payrollAllowances.payrollId, payrollRunId), (0, drizzle_orm_1.eq)(payroll_allowances_schema_1.payrollAllowances.employeeId, employeeId)))
                .execute();
            if (payrollAllowancesData.length > 0) {
                await trx
                    .insert(payroll_allowances_schema_1.payrollAllowances)
                    .values(payrollAllowancesData.map((a) => ({
                    payrollId: inserted.payrollRunId,
                    allowance_type: a.allowanceType,
                    allowanceAmount: toDec(a.allowanceAmount).toFixed(2),
                    employeeId: inserted.employeeId,
                })))
                    .execute();
            }
            const [empRow] = await trx
                .select({
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
            })
                .from(schema_1.employees)
                .where((0, drizzle_orm_1.eq)(schema_1.employees.id, inserted.employeeId))
                .limit(1);
            const fullName = empRow ? `${empRow.firstName} ${empRow.lastName}` : '';
            return { ...inserted, name: fullName };
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
            payGroupId: schema_1.employees.payGroupId,
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
                .returning({ id: schema_1.approvalSteps.id })
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
        const empIds = employeesList.map((e) => e.id);
        const payGroupIds = Array.from(new Set(employeesList.map((e) => e.payGroupId).filter(Boolean)));
        const month = payrollDate.slice(0, 7);
        const startISO = `${month}-01`;
        const endISO = new Date(`${month}-01T00:00:00Z`);
        endISO.setMonth(endISO.getMonth() + 1);
        endISO.setDate(0);
        const endISOstr = endISO.toISOString().slice(0, 10);
        const [deductionsRows, bonusesRows, payGroupsRows, groupAllowRows, adjustmentsRows, expensesRows,] = await Promise.all([
            this.hot.activeDeductionsForMany(empIds, payrollDate),
            this.hot.bonusesByRangeForMany(empIds, startISO, endISOstr),
            this.hot.payGroupsByIds(payGroupIds),
            this.hot.groupAllowancesForPayGroups(payGroupIds),
            this.hot.adjustmentsByDateForMany(companyId, empIds, payrollDate),
            this.hot.expensesByRangeForMany(empIds, startISO, endISOstr),
        ]);
        const toMapArray = (rows, key) => {
            const m = new Map();
            for (const r of rows) {
                const k = String(r[key]);
                const arr = m.get(k);
                if (arr)
                    arr.push(r);
                else
                    m.set(k, [r]);
            }
            return m;
        };
        const deductionsByEmp = toMapArray(deductionsRows, 'employee_id');
        const bonusesByEmp = toMapArray(bonusesRows, 'employee_id');
        const adjustmentsByEmp = toMapArray(adjustmentsRows, 'employee_id');
        const expensesByEmp = toMapArray(expensesRows, 'employee_id');
        const payGroupById = new Map(payGroupsRows.map((r) => [String(r.id), r]));
        const groupAllowByPg = toMapArray(groupAllowRows, 'pay_group_id');
        const runCache = {
            deductionsByEmp,
            bonusesByEmp,
            adjustmentsByEmp,
            expensesByEmp,
            payGroupById,
            groupAllowByPg,
        };
        this.hot.setRunCache(runCache);
        try {
            const payrollResults = await (0, p_map_1.default)(employeesList, async (employee) => this.calculatePayroll(employee.id, payrollDate, payrollRunId, companyId, user.id, workflowId), { concurrency: 12 });
            if (!multi) {
                await this.payslipService.generatePayslipsForCompany(companyId, payrollResults[0].payrollMonth);
            }
            return {
                payrollRunId,
                payrollDate,
                employeeCount: employeesList.length,
                approvalWorkflowId: workflowId,
            };
        }
        finally {
            this.hot.clearRunCache();
        }
    }
    async getPayrollSummaryByRunId(runId) {
        const rows = await this.db
            .select({
            employeeId: payroll_run_schema_1.payroll.employeeId,
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            basic: payroll_run_schema_1.payroll.basic,
            housing: payroll_run_schema_1.payroll.housing,
            transport: payroll_run_schema_1.payroll.transport,
            grossSalary: payroll_run_schema_1.payroll.grossSalary,
            netSalary: payroll_run_schema_1.payroll.netSalary,
            bonuses: payroll_run_schema_1.payroll.bonuses,
            payeTax: payroll_run_schema_1.payroll.payeTax,
            pensionContribution: payroll_run_schema_1.payroll.pensionContribution,
            employerPensionContribution: payroll_run_schema_1.payroll.employerPensionContribution,
            nhfContribution: payroll_run_schema_1.payroll.nhfContribution,
            totalDeductions: payroll_run_schema_1.payroll.totalDeductions,
            taxableIncome: payroll_run_schema_1.payroll.taxableIncome,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            reimbursements: payroll_run_schema_1.payroll.reimbursements,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
            isStarter: payroll_run_schema_1.payroll.isStarter,
            approvalStatus: payroll_run_schema_1.payroll.approvalStatus,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
        })
            .from(payroll_run_schema_1.payroll)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, payroll_run_schema_1.payroll.employeeId))
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, runId))
            .execute();
        const out = rows.map((r) => {
            const name = [r.firstName, r.lastName].filter(Boolean).join(' ');
            const startDate = new Date(`${r.payrollMonth}-01T00:00:00Z`);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);
            return {
                employeeId: r.employeeId,
                payrollRunId: r.payrollRunId,
                payrollDate: r.payrollDate,
                payrollMonth: r.payrollMonth,
                name,
                isStarter: Boolean(r.isStarter),
                basic: r.basic,
                housing: r.housing,
                transport: r.transport,
                grossSalary: r.grossSalary,
                netSalary: r.netSalary,
                bonuses: r.bonuses,
                payeTax: r.payeTax,
                pensionContribution: r.pensionContribution,
                employerPensionContribution: r.employerPensionContribution,
                nhfContribution: r.nhfContribution,
                totalDeductions: r.totalDeductions,
                taxableIncome: r.taxableIncome,
                salaryAdvance: r.salaryAdvance,
                reimbursements: r.reimbursements ?? [],
                voluntaryDeductions: r.voluntaryDeductions ?? [],
                approvalStatus: r.approvalStatus,
            };
        });
        out.sort((a, b) => a.name.localeCompare(b.name));
        return out;
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
            name: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
            companyName: schema_1.companies.name,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.eq)(schema_1.users.companyRoleId, schema_1.companyRoles.id))
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.users.companyId, schema_1.companies.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.companyId, existing[0].companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.name, approverRole)));
        const url = `${this.configService.get('CLIENT_DASHBOARD_URL')}/payroll/payroll-approval/${runId}`;
        await this.payrollApprovalEmailService.sendApprovalEmail(currentUserForApproval.email, currentUserForApproval.name, url, existing[0].payrollDate, currentUserForApproval.companyName);
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
    async discardPayrollRun(user, payrollRunId) {
        const companyId = user.companyId;
        if (!payrollRunId)
            throw new common_1.BadRequestException('payrollRunId is required');
        return this.db.transaction(async (trx) => {
            const rows = await trx
                .select({
                id: payroll_run_schema_1.payroll.id,
                employeeId: payroll_run_schema_1.payroll.employeeId,
                payrollDate: payroll_run_schema_1.payroll.payrollDate,
                workflowId: payroll_run_schema_1.payroll.workflowId,
            })
                .from(payroll_run_schema_1.payroll)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, payrollRunId)));
            if (rows.length === 0)
                throw new common_1.NotFoundException('No payroll found for this run and company.');
            const empIds = rows.map((r) => r.employeeId);
            const payrollDate = rows[0].payrollDate;
            const workflowId = rows[0].workflowId ?? null;
            await trx
                .delete(payroll_allowances_schema_1.payrollAllowances)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_allowances_schema_1.payrollAllowances.payrollId, payrollRunId), (0, drizzle_orm_1.inArray)(payroll_allowances_schema_1.payrollAllowances.employeeId, empIds)));
            await trx
                .delete(payroll_ytd_schema_1.payrollYtd)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.payrollDate, payrollDate), (0, drizzle_orm_1.inArray)(payroll_ytd_schema_1.payrollYtd.employeeId, empIds)));
            await trx
                .delete(payroll_run_schema_1.payrollApprovals)
                .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payrollApprovals.payrollRunId, payrollRunId));
            await trx
                .delete(payroll_run_schema_1.payroll)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, payrollRunId)));
            if (workflowId) {
                await trx
                    .delete(schema_1.approvalSteps)
                    .where((0, drizzle_orm_1.eq)(schema_1.approvalSteps.workflowId, workflowId));
                await trx
                    .delete(schema_1.approvalWorkflows)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.approvalWorkflows.entityId, payrollRunId)));
            }
            return {
                payrollRunId,
                deletedEmployees: rows.length,
                payrollDate,
                status: 'discarded',
            };
        });
    }
};
exports.RunService = RunService;
exports.RunService = RunService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_2.InjectQueue)('payrollQueue')),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __param(2, (0, common_1.Inject)(drizzle_module_1.HOT_QUERIES)),
    __metadata("design:paramtypes", [bullmq_1.Queue, Object, hot_queries_1.HotQueries,
        audit_service_1.AuditService,
        payroll_settings_service_1.PayrollSettingsService,
        compensation_service_1.CompensationService,
        tax_service_1.TaxService,
        payslip_service_1.PayslipService,
        salary_advance_service_1.SalaryAdvanceService,
        pusher_service_1.PusherService,
        payroll_approval_service_1.PayrollApprovalEmailService,
        config_1.ConfigService])
], RunService);
//# sourceMappingURL=run.service.js.map