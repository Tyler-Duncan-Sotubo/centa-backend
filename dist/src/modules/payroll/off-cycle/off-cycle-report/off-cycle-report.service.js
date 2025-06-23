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
exports.OffCycleReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const off_cycle_schema_1 = require("../schema/off-cycle.schema");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../../drizzle/schema");
const payroll_run_schema_1 = require("../../schema/payroll-run.schema");
let OffCycleReportService = class OffCycleReportService {
    constructor(db) {
        this.db = db;
    }
    async getOffCycleSummary(companyId, fromDate, toDate) {
        return this.db
            .select({
            employeeId: off_cycle_schema_1.offCyclePayroll.employeeId,
            name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
            payrollDate: off_cycle_schema_1.offCyclePayroll.payrollDate,
            type: off_cycle_schema_1.offCyclePayroll.type,
            amount: off_cycle_schema_1.offCyclePayroll.amount,
            taxable: off_cycle_schema_1.offCyclePayroll.taxable,
        })
            .from(off_cycle_schema_1.offCyclePayroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.companyId, companyId), (0, drizzle_orm_1.gte)(off_cycle_schema_1.offCyclePayroll.payrollDate, fromDate), (0, drizzle_orm_1.lte)(off_cycle_schema_1.offCyclePayroll.payrollDate, toDate)))
            .orderBy(off_cycle_schema_1.offCyclePayroll.payrollDate)
            .execute();
    }
    async getOffCycleVsRegular(companyId, month) {
        if (!month) {
            const date = new Date();
            month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        const [{ regGross, regTax, regNet }] = await this.db
            .select({
            regGross: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`,
            regTax: (0, drizzle_orm_1.sql) `
        SUM(
          ${payroll_run_schema_1.payroll.payeTax}
          + ${payroll_run_schema_1.payroll.nhfContribution}
          + ${payroll_run_schema_1.payroll.pensionContribution}
        )
      `,
            regNet: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary})`,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, false)))
            .execute();
        const [{ offGross, offTax, offNet }] = await this.db
            .select({
            offGross: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`,
            offTax: (0, drizzle_orm_1.sql) `
        SUM(
          ${payroll_run_schema_1.payroll.payeTax}
          + ${payroll_run_schema_1.payroll.nhfContribution}
          + ${payroll_run_schema_1.payroll.pensionContribution}
        )
      `,
            offNet: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.netSalary})`,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true)))
            .execute();
        return {
            regular: { gross: regGross ?? 0, tax: regTax ?? 0, net: regNet ?? 0 },
            offCycle: { gross: offGross ?? 0, tax: offTax ?? 0, net: offNet ?? 0 },
            offPercent: regGross ? ((offGross ?? 0) / regGross) * 100 : 0,
        };
    }
    async getOffCycleByEmployee(companyId, employeeId) {
        return this.db
            .select({
            payrollDate: off_cycle_schema_1.offCyclePayroll.payrollDate,
            type: off_cycle_schema_1.offCyclePayroll.type,
            amount: off_cycle_schema_1.offCyclePayroll.amount,
            taxable: off_cycle_schema_1.offCyclePayroll.taxable,
            remarks: off_cycle_schema_1.offCyclePayroll.notes,
            netPaid: payroll_run_schema_1.payroll.netSalary,
        })
            .from(off_cycle_schema_1.offCyclePayroll)
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollRunId, payroll_run_schema_1.payroll.payrollRunId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, payroll_run_schema_1.payroll.employeeId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.companyId, companyId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, employeeId)))
            .orderBy(off_cycle_schema_1.offCyclePayroll.payrollDate)
            .execute();
    }
    async getOffCycleTypeBreakdown(companyId, month) {
        const qb = this.db
            .select({
            type: off_cycle_schema_1.offCyclePayroll.type,
            total: (0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary})`,
        })
            .from(off_cycle_schema_1.offCyclePayroll)
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollRunId, payroll_run_schema_1.payroll.payrollRunId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, payroll_run_schema_1.payroll.employeeId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true)));
        if (month) {
            qb.where((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month));
        }
        return qb
            .groupBy(off_cycle_schema_1.offCyclePayroll.type)
            .orderBy((0, drizzle_orm_1.sql) `SUM(${payroll_run_schema_1.payroll.grossSalary}) DESC`)
            .execute();
    }
    async getOffCycleTaxImpact(companyId, month) {
        const lines = await this.db
            .select({
            payrollDate: payroll_run_schema_1.payroll.payrollDate,
            gross: payroll_run_schema_1.payroll.grossSalary,
            pension: payroll_run_schema_1.payroll.pensionContribution,
            nhf: payroll_run_schema_1.payroll.nhfContribution,
            paye: payroll_run_schema_1.payroll.payeTax,
            net: payroll_run_schema_1.payroll.netSalary,
            type: off_cycle_schema_1.offCyclePayroll.type,
        })
            .from(off_cycle_schema_1.offCyclePayroll)
            .innerJoin(payroll_run_schema_1.payroll, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollRunId, payroll_run_schema_1.payroll.payrollRunId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, payroll_run_schema_1.payroll.employeeId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true), month ? (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month) : (0, drizzle_orm_1.sql) `TRUE`))
            .orderBy(payroll_run_schema_1.payroll.payrollDate)
            .execute();
        const [{ regTax = 0 }] = await this.db
            .select({
            regTax: (0, drizzle_orm_1.sql) `
        SUM(${payroll_run_schema_1.payroll.payeTax} + ${payroll_run_schema_1.payroll.nhfContribution} + ${payroll_run_schema_1.payroll.pensionContribution})
      `,
        })
            .from(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, false), month ? (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollMonth, month) : (0, drizzle_orm_1.sql) `TRUE`))
            .execute();
        return { lines, totalRegularTax: regTax };
    }
    async getOffCycleDashboard(companyId, options) {
        const { month, fromDate, toDate, employeeId } = options || {};
        const [summary, vsRegular, byEmployee, typeBreakdown, taxImpact] = await Promise.all([
            this.getOffCycleSummary(companyId, fromDate ?? '1900-01-01', toDate ?? '2999-12-31'),
            this.getOffCycleVsRegular(companyId, month ?? new Date().toISOString().slice(0, 7)),
            employeeId
                ? this.getOffCycleByEmployee(companyId, employeeId)
                : Promise.resolve([]),
            this.getOffCycleTypeBreakdown(companyId, month),
            this.getOffCycleTaxImpact(companyId, month),
        ]);
        return {
            summary,
            vsRegular,
            byEmployee,
            typeBreakdown,
            taxImpact,
        };
    }
};
exports.OffCycleReportService = OffCycleReportService;
exports.OffCycleReportService = OffCycleReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], OffCycleReportService);
//# sourceMappingURL=off-cycle-report.service.js.map