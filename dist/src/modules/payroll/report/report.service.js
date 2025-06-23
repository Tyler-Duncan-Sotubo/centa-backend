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
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const schema_1 = require("../../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const payroll_ytd_schema_1 = require("../schema/payroll-ytd.schema");
const payroll_run_schema_1 = require("../schema/payroll-run.schema");
const pay_groups_schema_1 = require("../schema/pay-groups.schema");
const compensation_schema_1 = require("../../core/employees/schema/compensation.schema");
const pay_schedules_service_1 = require("../pay-schedules/pay-schedules.service");
const decimal_js_1 = require("decimal.js");
const salary_advance_schema_1 = require("../salary-advance/schema/salary-advance.schema");
let ReportService = class ReportService {
    constructor(db, paySchedulesService) {
        this.db = db;
        this.paySchedulesService = paySchedulesService;
    }
    async getLatestPayrollSummaryWithVariance(companyId) {
        const summaries = await this.db
            .select({
            payroll_run_id: payroll_run_schema_1.payroll.payrollRunId,
            payroll_date: payroll_run_schema_1.payroll.payrollDate,
            total_gross_salary: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`.as('total_gross_salary'),
            total_netSalary: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary})`.as('total_netSalary'),
            total_deductions: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.payeTax} + ${payroll_run_schema_1.payroll.pensionContribution} + ${payroll_run_schema_1.payroll.nhfContribution})`.as('total_deductions'),
            employee_count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${payroll_run_schema_1.payroll.employeeId})`.as('employee_count'),
            totalPayrollCost: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary} + ${payroll_run_schema_1.payroll.pensionContribution} + ${payroll_run_schema_1.payroll.nhfContribution} + ${payroll_run_schema_1.payroll.employerPensionContribution})`.as('totalPayrollCost'),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy(payroll_run_schema_1.payroll.payrollRunId, payroll_run_schema_1.payroll.payrollDate)
            .orderBy((0, drizzle_orm_1.desc)(payroll_run_schema_1.payroll.payrollDate))
            .limit(2)
            .execute();
        if (summaries.length === 0) {
            return { current: null, variance: null };
        }
        const [current, previous] = summaries;
        const variance = {
            gross_salary_variance: (current.total_gross_salary ?? 0) - (previous?.total_gross_salary ?? 0),
            netSalary_variance: (current.total_netSalary ?? 0) - (previous?.total_netSalary ?? 0),
            deductions_variance: (current.total_deductions ?? 0) - (previous?.total_deductions ?? 0),
            payroll_cost_variance: (current.totalPayrollCost ?? 0) - (previous?.totalPayrollCost ?? 0),
            employee_count_variance: (current.employee_count ?? 0) - (previous?.employee_count ?? 0),
        };
        return {
            current,
            variance,
        };
    }
    async getEmployeePayrollVariance(companyId) {
        const recentRuns = await this.db
            .select({
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy(payroll_run_schema_1.payroll.payrollRunId, payroll_run_schema_1.payroll.payrollDate)
            .orderBy((0, drizzle_orm_1.desc)(payroll_run_schema_1.payroll.payrollDate))
            .limit(2)
            .execute();
        if (recentRuns.length < 2)
            return null;
        const [currentRun, previousRun] = recentRuns;
        const [currentData, previousData] = await Promise.all([
            this.db
                .select({
                employeeId: payroll_run_schema_1.payroll.employeeId,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                grossSalary: payroll_run_schema_1.payroll.grossSalary,
                netSalary: payroll_run_schema_1.payroll.netSalary,
                paye: payroll_run_schema_1.payroll.payeTax,
                pension: payroll_run_schema_1.payroll.pensionContribution,
                nhf: payroll_run_schema_1.payroll.nhfContribution,
                employerPension: payroll_run_schema_1.payroll.employerPensionContribution,
            })
                .from(payroll_run_schema_1.payroll)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, currentRun.payrollRunId)),
            this.db
                .select({
                employeeId: payroll_run_schema_1.payroll.employeeId,
                firstName: schema_1.employees.firstName,
                lastName: schema_1.employees.lastName,
                grossSalary: payroll_run_schema_1.payroll.grossSalary,
                netSalary: payroll_run_schema_1.payroll.netSalary,
                paye: payroll_run_schema_1.payroll.payeTax,
                pension: payroll_run_schema_1.payroll.pensionContribution,
                nhf: payroll_run_schema_1.payroll.nhfContribution,
                employerPension: payroll_run_schema_1.payroll.employerPensionContribution,
            })
                .from(payroll_run_schema_1.payroll)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, previousRun.payrollRunId)),
        ]);
        const currMap = new Map(currentData.map((e) => [e.employeeId, e]));
        const prevMap = new Map(previousData.map((e) => [e.employeeId, e]));
        const allEmployeeIds = new Set([
            ...currentData.map((e) => e.employeeId),
            ...previousData.map((e) => e.employeeId),
        ]);
        const result = Array.from(allEmployeeIds).map((employeeId) => {
            const curr = currMap.get(employeeId) ?? {
                grossSalary: 0,
                netSalary: 0,
                paye: 0,
                pension: 0,
                nhf: 0,
                employerPension: 0,
                firstName: '',
                lastName: '',
            };
            const prev = prevMap.get(employeeId) ?? {
                grossSalary: 0,
                netSalary: 0,
                paye: 0,
                pension: 0,
                nhf: 0,
                employerPension: 0,
                firstName: '',
                lastName: '',
            };
            const get = (val) => new decimal_js_1.default(val || 0);
            const firstName = curr.firstName ?? prev.firstName ?? 'Unknown';
            const lastName = curr.lastName ?? prev.lastName ?? '';
            const isNotInCurrent = !currMap.has(employeeId);
            const fullName = `${firstName} ${lastName}`.trim() +
                (isNotInCurrent
                    ? `${prev.firstName} ${prev.lastName}(Not in recent payroll)'`
                    : '');
            return {
                employeeId,
                fullName: fullName,
                previous: {
                    grossSalary: get(prev.grossSalary),
                    netSalary: get(prev.netSalary),
                    paye: get(prev.paye),
                    pension: get(prev.pension),
                    nhf: get(prev.nhf),
                    employerPension: get(prev.employerPension),
                },
                current: {
                    grossSalary: get(curr.grossSalary),
                    netSalary: get(curr.netSalary),
                    paye: get(curr.paye),
                    pension: get(curr.pension),
                    nhf: get(curr.nhf),
                    employerPension: get(curr.employerPension),
                },
                variance: {
                    grossSalaryDiff: get(curr.grossSalary).minus(get(prev.grossSalary)),
                    netSalaryDiff: get(curr.netSalary).minus(get(prev.netSalary)),
                    payeDiff: get(curr.paye).minus(get(prev.paye)),
                    pensionDiff: get(curr.pension).minus(get(prev.pension)),
                    nhfDiff: get(curr.nhf).minus(get(prev.nhf)),
                    employerPensionDiff: get(curr.employerPension).minus(get(prev.employerPension)),
                },
            };
        });
        return {
            payrollRunId: currentRun.payrollRunId,
            payrollDate: currentRun.payrollDate,
            previousPayrollDate: previousRun.payrollDate,
            varianceList: result,
        };
    }
    async getVoluntaryDeductionTotals(companyId) {
        const rows = await this.db
            .select({
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            voluntaryDeductions: payroll_run_schema_1.payroll.voluntaryDeductions,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .execute();
        const grouped = new Map();
        for (const row of rows) {
            const voluntaryList = Array.isArray(row.voluntaryDeductions)
                ? row.voluntaryDeductions
                : [];
            const total = voluntaryList.reduce((sum, d) => {
                const amount = Number(d.amount || 0);
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            grouped.set(row.payrollRunId, (grouped.get(row.payrollRunId) || 0) + total);
        }
        return grouped;
    }
    async getPayrollSummary(companyId) {
        const payrollTotal = await this.db
            .select({
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            approvalStatus: payroll_run_schema_1.payroll.approvalStatus,
            paymentStatus: payroll_run_schema_1.payroll.paymentStatus,
            totalGrossSalary: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`.as('total_gross_salary'),
            employeeCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${payroll_run_schema_1.payroll.employeeId})`.as('employee_count'),
            totalDeductions: (0, drizzle_orm_1.sql) `
          SUM(${payroll_run_schema_1.payroll.payeTax} + ${payroll_run_schema_1.payroll.pensionContribution} + ${payroll_run_schema_1.payroll.nhfContribution} + ${payroll_run_schema_1.payroll.salaryAdvance})
        `.as('total_deductions'),
            totalNetSalary: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary})`.as('total_netSalary'),
            totalPayrollCost: (0, drizzle_orm_1.sql) `
  SUM(
    ${payroll_run_schema_1.payroll.grossSalary} + ${payroll_run_schema_1.payroll.employerPensionContribution} +
    COALESCE(
      (SELECT SUM( (e->>'amount')::numeric )
       FROM jsonb_array_elements(${payroll_run_schema_1.payroll.reimbursements}) AS e),
      0
    )
  )
`.as('totalPayrollCost'),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .orderBy((0, drizzle_orm_1.desc)(payroll_run_schema_1.payroll.payrollDate))
            .groupBy(payroll_run_schema_1.payroll.payrollRunId, payroll_run_schema_1.payroll.payrollDate, payroll_run_schema_1.payroll.payrollMonth, payroll_run_schema_1.payroll.approvalStatus, payroll_run_schema_1.payroll.paymentStatus)
            .execute();
        const voluntaryTotalsMap = await this.getVoluntaryDeductionTotals(companyId);
        const enriched = payrollTotal.map((row) => {
            const voluntary = voluntaryTotalsMap.get(row.payrollRunId) || 0;
            return {
                ...row,
                voluntaryDeductions: voluntary,
                totalDeductions: Number(row.totalDeductions) + voluntary,
            };
        });
        return enriched;
    }
    async getCombinedPayroll(companyId) {
        const [payrollSummary, nextPayDate] = await Promise.all([
            this.getPayrollSummary(companyId),
            this.paySchedulesService.getNextPayDate(companyId),
        ]);
        return {
            payrollSummary,
            nextPayDate,
        };
    }
    async getPayrollDashboard(companyId, month) {
        const currentYear = new Date().getFullYear();
        const whereRun = [(0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId)];
        if (month) {
            whereRun.push((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month));
        }
        let runSummaries = await this.db
            .select({
            payrollRunId: payroll_run_schema_1.payroll.payrollRunId,
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            approvalStatus: payroll_run_schema_1.payroll.approvalStatus,
            paymentStatus: payroll_run_schema_1.payroll.paymentStatus,
            totalGross: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`.as('totalGross'),
            totalDeductions: (0, drizzle_orm_1.sql) `
        SUM(
          ${payroll_run_schema_1.payroll.payeTax}
        + ${payroll_run_schema_1.payroll.pensionContribution}
        + ${payroll_run_schema_1.payroll.nhfContribution}
        + ${payroll_run_schema_1.payroll.customDeductions}
        )
      `.as('totalDeductions'),
            totalBonuses: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.bonuses})`.as('totalBonuses'),
            totalNet: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary})`.as('totalNet'),
            employeeCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${payroll_run_schema_1.payroll.employeeId})`.as('employeeCount'),
            costPerRun: (0, drizzle_orm_1.sql) `
        SUM(
          ${payroll_run_schema_1.payroll.grossSalary}
        + ${payroll_run_schema_1.payroll.employerPensionContribution}
        + ${payroll_run_schema_1.payroll.bonuses}
        )
      `.as('costPerRun'),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)(...whereRun))
            .groupBy(payroll_run_schema_1.payroll.payrollRunId, payroll_run_schema_1.payroll.payrollDate, payroll_run_schema_1.payroll.payrollMonth, payroll_run_schema_1.payroll.approvalStatus, payroll_run_schema_1.payroll.paymentStatus)
            .orderBy((0, drizzle_orm_1.desc)(payroll_run_schema_1.payroll.payrollDate))
            .execute();
        runSummaries = runSummaries.map((row, i, arr) => {
            const prev = arr[i + 1];
            const deltaGross = prev ? row.totalGross - prev.totalGross : 0;
            const pctGross = prev && prev.totalGross ? (deltaGross / prev.totalGross) * 100 : 0;
            return {
                ...row,
                deltaGross,
                pctGross,
            };
        });
        const [ytdRow] = await this.db
            .select({
            totalGrossYTD: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary})`.as('totalGrossYTD'),
            totalDeductionsYTD: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.totalDeductions})`.as('totalDeductionsYTD'),
            totalBonusesYTD: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.bonuses})`.as('totalBonusesYTD'),
            totalNetYTD: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.netSalary})`.as('totalNetYTD'),
            ytdEmployeeCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${payroll_ytd_schema_1.payrollYtd.employeeId})`.as('ytdEmployeeCount'),
        })
            .from(payroll_ytd_schema_1.payrollYtd)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.year, currentYear)))
            .execute();
        const yearToDate = {
            year: String(currentYear),
            totalGrossYTD: ytdRow?.totalGrossYTD ?? 0,
            totalDeductionsYTD: ytdRow?.totalDeductionsYTD ?? 0,
            totalBonusesYTD: ytdRow?.totalBonusesYTD ?? 0,
            totalNetYTD: ytdRow?.totalNetYTD ?? 0,
            employeeCountYTD: ytdRow?.ytdEmployeeCount ?? 0,
        };
        const [{ headcount }] = await this.db
            .select({ headcount: (0, drizzle_orm_1.sql) `COUNT(*)`.as('headcount') })
            .from(schema_1.employees)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active')))
            .execute();
        const [{ totalCurrentSalary }] = await this.db
            .select({
            totalCurrentSalary: (0, drizzle_orm_1.sql) `SUM(${compensation_schema_1.employeeCompensations.grossSalary})`.as('totalCurrentSalary'),
        })
            .from(compensation_schema_1.employeeCompensations)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(compensation_schema_1.employeeCompensations.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.employees.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.employees.employmentStatus, 'active')))
            .execute();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        const startMonth = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
        const rawTrend = await this.db
            .select({
            month: payroll_ytd_schema_1.payrollYtd.payrollMonth,
            monthGross: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary})`.as('monthGross'),
            monthDeductions: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.totalDeductions})`.as('monthDeductions'),
            monthBonuses: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.bonuses})`.as('monthBonuses'),
            monthNet: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.netSalary})`.as('monthNet'),
        })
            .from(payroll_ytd_schema_1.payrollYtd)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId), (0, drizzle_orm_1.gte)(payroll_ytd_schema_1.payrollYtd.payrollMonth, startMonth)))
            .groupBy(payroll_ytd_schema_1.payrollYtd.payrollMonth)
            .orderBy(payroll_ytd_schema_1.payrollYtd.payrollMonth)
            .execute();
        const costTrend = rawTrend.map((row, idx, arr) => {
            const prev = arr[idx - 1];
            const monthCost = row.monthGross + row.monthBonuses + row.monthDeductions;
            let deltaCost = 0, pctChange = 0;
            if (prev) {
                const prevCost = prev.monthGross + prev.monthBonuses + prev.monthDeductions;
                deltaCost = monthCost - prevCost;
                pctChange = prevCost ? (deltaCost / prevCost) * 100 : 0;
            }
            return {
                ...row,
                monthCost,
                deltaCost,
                pctChange,
            };
        });
        return {
            runSummaries,
            yearToDate,
            headcount,
            totalCurrentSalary,
            costTrend,
        };
    }
    async getPayrollCostReport(companyId, month) {
        const [payGroupCost, departmentCost] = await Promise.all([
            this.getCostByPayGroup(companyId, month),
            this.getCostByDepartment(companyId, month),
        ]);
        return {
            payGroupCost: payGroupCost.map((row) => ({
                ...row,
                totalGross: row.totalGross ?? 0,
                totalNet: row.totalNet ?? 0,
                headcount: row.headcount ?? 0,
            })),
            departmentCost: departmentCost.map((row) => ({
                ...row,
                totalGross: row.totalGross ?? 0,
                totalNet: row.totalNet ?? 0,
                headcount: row.headcount ?? 0,
            })),
        };
    }
    async getCostByPayGroup(companyId, month) {
        return await this.db
            .select({
            payGroupId: pay_groups_schema_1.payGroups.id,
            payGroupName: pay_groups_schema_1.payGroups.name,
            totalGross: (0, drizzle_orm_1.sql) `
        SUM(${payroll_run_schema_1.payroll.grossSalary})
      `.as('totalGross'),
            totalNet: (0, drizzle_orm_1.sql) `
        SUM(${payroll_run_schema_1.payroll.netSalary})
      `.as('totalNet'),
            headcount: (0, drizzle_orm_1.sql) `
        COUNT(DISTINCT ${payroll_run_schema_1.payroll.employeeId})
      `.as('headcount'),
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .innerJoin(pay_groups_schema_1.payGroups, (0, drizzle_orm_1.eq)(schema_1.employees.payGroupId, pay_groups_schema_1.payGroups.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month)))
            .groupBy(pay_groups_schema_1.payGroups.id, pay_groups_schema_1.payGroups.name)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`))
            .execute();
    }
    async getCostByDepartment(companyId, month) {
        return await this.db
            .select({
            departmentName: schema_1.departments.name,
            totalGross: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`.as('totalGross'),
            totalNet: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary})`.as('totalNet'),
            headcount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${payroll_run_schema_1.payroll.employeeId})`.as('headcount'),
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .innerJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month)))
            .groupBy(schema_1.departments.id, schema_1.departments.name)
            .execute();
    }
    async getTopBonusRecipients(companyId, month, limit = 10) {
        return await this.db
            .select({
            employeeId: payroll_run_schema_1.payroll.employeeId,
            fullName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`.as('fullName'),
            bonus: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.bonuses})`.as('bonus'),
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month)))
            .groupBy(schema_1.employees.id, schema_1.employees.firstName, schema_1.employees.lastName, payroll_run_schema_1.payroll.employeeId)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.bonuses})`))
            .limit(limit)
            .execute();
    }
    async getSalaryInsights(companyId) {
        const salaryBreakdown = await this.db
            .select({
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            employeeId: payroll_run_schema_1.payroll.employeeId,
            employeeName: (0, drizzle_orm_1.sql) `${schema_1.employees.firstName} || ' ' || ${schema_1.employees.lastName}`.as('employeeName'),
            grossSalary: (0, drizzle_orm_1.sum)(payroll_run_schema_1.payroll.grossSalary).as('grossSalary'),
            netSalary: (0, drizzle_orm_1.sum)(payroll_run_schema_1.payroll.netSalary).as('netSalary'),
            deductions: (0, drizzle_orm_1.sum)(payroll_run_schema_1.payroll.totalDeductions).as('deductions'),
            bonuses: (0, drizzle_orm_1.sum)(payroll_run_schema_1.payroll.bonuses).as('bonuses'),
            paymentStatus: payroll_run_schema_1.payroll.paymentStatus,
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy(payroll_run_schema_1.payroll.payrollMonth, payroll_run_schema_1.payroll.employeeId, schema_1.employees.firstName, schema_1.employees.lastName, payroll_run_schema_1.payroll.paymentStatus)
            .execute();
        const stats = await this.db
            .select({
            avgSalary: (0, drizzle_orm_1.avg)(payroll_run_schema_1.payroll.netSalary),
            highestPaid: (0, drizzle_orm_1.max)(payroll_run_schema_1.payroll.netSalary),
            lowestPaid: (0, drizzle_orm_1.min)(payroll_run_schema_1.payroll.netSalary),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .execute();
        const distribution = await this.db
            .select({
            salaryRange: (0, drizzle_orm_1.sql) `
          CASE
            WHEN ${payroll_run_schema_1.payroll.netSalary} < 50000 THEN 'Below 50K'
            WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 50000 AND 100000 THEN '50K - 100K'
            WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 100000 AND 200000 THEN '100K - 200K'
            WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 200000 AND 500000 THEN '200K - 500K'
            WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 500000 AND 1000000 THEN '500K - 1M'
            ELSE 'Above 1M'
          END
        `.as('salaryRange'),
            count: (0, drizzle_orm_1.countDistinct)(payroll_run_schema_1.payroll.employeeId),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy((0, drizzle_orm_1.sql) `
        CASE
          WHEN ${payroll_run_schema_1.payroll.netSalary} < 50000 THEN 'Below 50K'
          WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 50000 AND 100000 THEN '50K - 100K'
          WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 100000 AND 200000 THEN '100K - 200K'
          WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 200000 AND 500000 THEN '200K - 500K'
          WHEN ${payroll_run_schema_1.payroll.netSalary} BETWEEN 500000 AND 1000000 THEN '500K - 1M'
          ELSE 'Above 1M'
        END
      `)
            .execute();
        const byDepartment = await this.db
            .select({
            departmentName: schema_1.departments.name,
            totalNetSalary: (0, drizzle_orm_1.sum)(payroll_run_schema_1.payroll.netSalary),
        })
            .from(payroll_run_schema_1.payroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, schema_1.employees.id))
            .innerJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.employees.departmentId, schema_1.departments.id))
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy(schema_1.departments.name)
            .execute();
        return {
            breakdown: salaryBreakdown,
            stats: stats[0],
            distribution,
            byDepartment,
        };
    }
    async YtdReport(companyId) {
        const currentYear = new Date().getFullYear();
        const ytdData = await this.db
            .select({
            employeeId: payroll_ytd_schema_1.payrollYtd.employeeId,
            firstName: schema_1.employees.firstName,
            lastName: schema_1.employees.lastName,
            employeeNumber: schema_1.employees.employeeNumber,
            gross_salary_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary}) `,
            net_salary_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.netSalary}) `,
            paye_tax_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.PAYE}) `,
            pension_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.pension}) `,
            employer_pension_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.employerPension}) `,
            nhf_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.nhf}) `,
        })
            .from(payroll_ytd_schema_1.payrollYtd)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId))
            .groupBy(payroll_ytd_schema_1.payrollYtd.employeeId, schema_1.employees.firstName, schema_1.employees.lastName, schema_1.employees.employeeNumber)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.employees.employeeNumber))
            .execute();
        const [companyTotals] = await this.db
            .select({
            gross_salary_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary})`,
            net_salary_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.netSalary})`,
            paye_tax_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.PAYE})`,
            pension_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.pension})`,
            employer_pension_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.employerPension})`,
            nhf_contribution_ytd: (0, drizzle_orm_1.sql) `SUM(${payroll_ytd_schema_1.payrollYtd.nhf})`,
        })
            .from(payroll_ytd_schema_1.payrollYtd)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.year, currentYear)))
            .execute();
        return {
            totals: companyTotals,
            employees: ytdData,
        };
    }
    async getPayrollAnalyticsReport(companyId, month) {
        if (!month) {
            month = new Date().toISOString().slice(0, 7);
        }
        const [summary, salaryInsights, ytdData] = await Promise.all([
            this.getPayrollSummary(companyId),
            this.getSalaryInsights(companyId),
            this.YtdReport(companyId),
        ]);
        return {
            month: month ?? new Date().toISOString().slice(0, 7),
            summary,
            salaryInsights,
            ytdData,
        };
    }
    async getDeductionBreakdownByMonth(companyId) {
        return await this.db
            .select({
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            paye: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.payeTax})`.as('paye'),
            pension: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.pensionContribution})`.as('pension'),
            nhf: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.nhfContribution})`.as('nhf'),
            custom: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.customDeductions})`.as('custom'),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy(payroll_run_schema_1.payroll.payrollMonth)
            .orderBy(payroll_run_schema_1.payroll.payrollMonth)
            .execute();
    }
    async getEmployerCostBreakdownByMonth(companyId) {
        const rows = await this.db
            .select({
            payrollMonth: payroll_run_schema_1.payroll.payrollMonth,
            gross: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`.as('gross'),
            employerPension: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.employerPensionContribution})`.as('employerPension'),
            totalCost: (0, drizzle_orm_1.sql) `
          SUM(${payroll_run_schema_1.payroll.grossSalary} + ${payroll_run_schema_1.payroll.employerPensionContribution})
        `.as('totalCost'),
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId))
            .groupBy(payroll_run_schema_1.payroll.payrollMonth)
            .orderBy(payroll_run_schema_1.payroll.payrollMonth)
            .execute();
        return rows;
    }
    async getDeductionsByEmployee(companyId, month) {
        const payrolls = await this.db
            .select({
            employeeId: payroll_run_schema_1.payroll.employeeId,
            paye: payroll_run_schema_1.payroll.payeTax,
            pension: payroll_run_schema_1.payroll.pensionContribution,
            nhf: payroll_run_schema_1.payroll.nhfContribution,
            salaryAdvance: payroll_run_schema_1.payroll.salaryAdvance,
            voluntary: payroll_run_schema_1.payroll.voluntaryDeductions,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
        })
            .from(payroll_run_schema_1.payroll)
            .leftJoin(schema_1.employees, (0, drizzle_orm_1.eq)(schema_1.employees.id, payroll_run_schema_1.payroll.employeeId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month)))
            .execute();
        return payrolls.map((row) => {
            const voluntaryTotal = Array.isArray(row.voluntary)
                ? row.voluntary.reduce((sum, d) => sum + Number(d.amount || 0), 0)
                : 0;
            const total = Number(row.paye) +
                Number(row.pension) +
                Number(row.nhf) +
                Number(row.salaryAdvance) +
                voluntaryTotal;
            return {
                employeeId: row.employeeId,
                employeeName: row.employeeName,
                paye: row.paye,
                pension: row.pension,
                nhf: row.nhf,
                salaryAdvance: row.salaryAdvance,
                voluntary: voluntaryTotal,
                total,
            };
        });
    }
    async getDeductionsSummary(companyId, month) {
        const [deductionBreakdown, employerCostBreakdown, deductionByEmployee] = await Promise.all([
            this.getDeductionBreakdownByMonth(companyId),
            this.getEmployerCostBreakdownByMonth(companyId),
            this.getDeductionsByEmployee(companyId, month ?? new Date().toISOString().slice(0, 7)),
        ]);
        return {
            deductionBreakdown,
            employerCostBreakdown,
            deductionByEmployee,
        };
    }
    async getLoanFullReport(companyId) {
        const [outstandingSummary, monthlySummary] = await Promise.all([
            this.db
                .select({
                employeeId: salary_advance_schema_1.salaryAdvance.employeeId,
                employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
                totalLoanAmount: salary_advance_schema_1.salaryAdvance.amount,
                totalRepaid: salary_advance_schema_1.salaryAdvance.totalPaid,
                outstanding: (0, drizzle_orm_1.sql) `(${salary_advance_schema_1.salaryAdvance.amount} - ${salary_advance_schema_1.salaryAdvance.totalPaid})`.as('outstanding'),
                status: salary_advance_schema_1.salaryAdvance.status,
            })
                .from(salary_advance_schema_1.salaryAdvance)
                .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, schema_1.employees.id))
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.companyId, companyId))
                .execute(),
            this.db
                .select({
                year: (0, drizzle_orm_1.sql) `EXTRACT(YEAR FROM ${salary_advance_schema_1.salaryAdvance.createdAt})`.as('year'),
                month: (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${salary_advance_schema_1.salaryAdvance.createdAt})`.as('month'),
                status: salary_advance_schema_1.salaryAdvance.status,
                totalLoanAmount: (0, drizzle_orm_1.sql) `SUM(${salary_advance_schema_1.salaryAdvance.amount})`.as('totalLoanAmount'),
                totalRepaid: (0, drizzle_orm_1.sql) `SUM(${salary_advance_schema_1.salaryAdvance.totalPaid})`.as('totalRepaid'),
                totalOutstanding: (0, drizzle_orm_1.sql) `SUM(${salary_advance_schema_1.salaryAdvance.amount} - ${salary_advance_schema_1.salaryAdvance.totalPaid})`.as('totalOutstanding'),
            })
                .from(salary_advance_schema_1.salaryAdvance)
                .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.companyId, companyId))
                .groupBy((0, drizzle_orm_1.sql) `EXTRACT(YEAR FROM ${salary_advance_schema_1.salaryAdvance.createdAt})`, (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${salary_advance_schema_1.salaryAdvance.createdAt})`, salary_advance_schema_1.salaryAdvance.status)
                .orderBy((0, drizzle_orm_1.sql) `EXTRACT(YEAR FROM ${salary_advance_schema_1.salaryAdvance.createdAt}) DESC`, (0, drizzle_orm_1.sql) `EXTRACT(MONTH FROM ${salary_advance_schema_1.salaryAdvance.createdAt}) DESC`)
                .execute(),
        ]);
        return {
            outstandingSummary,
            monthlySummary,
        };
    }
    async getLoanRepaymentReport(companyId) {
        const rows = await this.db
            .select({
            employeeId: schema_1.employees.id,
            employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            totalRepaid: (0, drizzle_orm_1.sql) `SUM(${salary_advance_schema_1.repayments.amountPaid})`.as('totalRepaid'),
            repaymentCount: (0, drizzle_orm_1.sql) `COUNT(${salary_advance_schema_1.repayments.id})`.as('repaymentCount'),
            firstRepayment: (0, drizzle_orm_1.sql) `MIN(${salary_advance_schema_1.repayments.paidAt})`.as('firstRepayment'),
            lastRepayment: (0, drizzle_orm_1.sql) `MAX(${salary_advance_schema_1.repayments.paidAt})`.as('lastRepayment'),
        })
            .from(salary_advance_schema_1.repayments)
            .innerJoin(salary_advance_schema_1.salaryAdvance, (0, drizzle_orm_1.eq)(salary_advance_schema_1.repayments.salaryAdvanceId, salary_advance_schema_1.salaryAdvance.id))
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.eq)(salary_advance_schema_1.salaryAdvance.companyId, companyId))
            .groupBy(schema_1.employees.id, schema_1.employees.firstName, schema_1.employees.lastName)
            .orderBy(schema_1.employees.firstName)
            .execute();
        return rows;
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, pay_schedules_service_1.PaySchedulesService])
], ReportService);
//# sourceMappingURL=report.service.js.map