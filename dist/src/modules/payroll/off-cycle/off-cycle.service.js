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
exports.OffCycleService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const drizzle_orm_1 = require("drizzle-orm");
const audit_service_1 = require("../../audit/audit.service");
const off_cycle_schema_1 = require("./schema/off-cycle.schema");
const uuid_1 = require("uuid");
const payroll_settings_service_1 = require("../settings/payroll-settings.service");
const decimal_js_1 = require("decimal.js");
const payroll_run_schema_1 = require("../schema/payroll-run.schema");
const schema_1 = require("../../../drizzle/schema");
const payroll_ytd_schema_1 = require("../schema/payroll-ytd.schema");
const approval_workflow_schema_1 = require("../../../company-settings/schema/approval-workflow.schema");
const compensation_schema_1 = require("../../core/employees/schema/compensation.schema");
let OffCycleService = class OffCycleService {
    constructor(db, auditService, payrollSettingsService) {
        this.db = db;
        this.auditService = auditService;
        this.payrollSettingsService = payrollSettingsService;
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
    async calculateOffCyclePayroll(runId, companyId, userId, workflowId) {
        const entries = await this.db
            .select()
            .from(off_cycle_schema_1.offCyclePayroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.companyId, companyId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollRunId, runId)))
            .execute();
        if (!entries.length) {
            throw new Error('No entries found for this off-cycle run');
        }
        const settings = await this.payrollSettingsService.getAllPayrollSettings(companyId);
        const relief = new decimal_js_1.default(settings.default_tax_relief || 200000);
        const empPct = new decimal_js_1.default(settings.default_pension_employee_percent || 8);
        const erPct = new decimal_js_1.default(settings.default_pension_employer_percent || 10);
        const nhfPct = new decimal_js_1.default(settings.nhf_percent || 2.5);
        const multi = settings.multi_level_approval;
        const results = await Promise.all(entries.map(async (entry) => {
            const payrollDate = entry.payrollDate;
            const payrollMonth = payrollDate.toString().slice(0, 7);
            const employeeId = entry.employeeId;
            const [comp] = await this.db
                .select()
                .from(compensation_schema_1.employeeCompensations)
                .where((0, drizzle_orm_1.eq)(compensation_schema_1.employeeCompensations.employeeId, employeeId))
                .limit(1)
                .execute();
            const shouldApplyNHF = comp?.applyNHf ?? true;
            const grossSalary = new decimal_js_1.default(entry.amount);
            const employeePension = entry.taxable
                ? grossSalary.mul(empPct.div(100))
                : new decimal_js_1.default(0);
            const employerPension = entry.taxable
                ? grossSalary.mul(erPct.div(100))
                : new decimal_js_1.default(0);
            const nhf = entry.taxable && shouldApplyNHF
                ? grossSalary.mul(nhfPct.div(100))
                : new decimal_js_1.default(0);
            let paye = new decimal_js_1.default(0);
            let taxableIncome = new decimal_js_1.default(0);
            if (entry.taxable) {
                const [ytd] = await this.db
                    .select({
                    totalGross: (0, drizzle_orm_1.sql) `COALESCE(SUM(${payroll_ytd_schema_1.payrollYtd.grossSalary}), 0)`,
                    totalPAYE: (0, drizzle_orm_1.sql) `COALESCE(SUM(${payroll_ytd_schema_1.payrollYtd.PAYE}), 0)`,
                    count: (0, drizzle_orm_1.sql) `COUNT(*)`,
                })
                    .from(payroll_ytd_schema_1.payrollYtd)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.employeeId, employeeId), (0, drizzle_orm_1.eq)(payroll_ytd_schema_1.payrollYtd.companyId, companyId), (0, drizzle_orm_1.lt)(payroll_ytd_schema_1.payrollYtd.payrollDate, payrollDate)))
                    .execute();
                const ytdGross = new decimal_js_1.default(ytd?.totalGross || 0);
                const ytdPAYE = new decimal_js_1.default(ytd?.totalPAYE || 0);
                const monthsCompleted = new decimal_js_1.default(ytd?.count || 0);
                const monthsRemaining = decimal_js_1.default.max(12 - monthsCompleted.minus(1).toNumber(), 1);
                const projectedAnnualGross = ytdGross.plus(grossSalary.mul(monthsRemaining));
                const annualResult = this.calculatePAYE(projectedAnnualGross, employeePension, nhf, relief);
                const estimatedTotalPAYE = annualResult.paye;
                paye = decimal_js_1.default.max(estimatedTotalPAYE.minus(ytdPAYE).div(monthsRemaining), 0);
                taxableIncome = annualResult.taxableIncome.div(monthsRemaining);
            }
            const totalDeductions = paye.plus(employeePension).plus(nhf);
            const netSalary = grossSalary.minus(totalDeductions);
            const approvalStatus = multi ? 'pending' : 'approved';
            const approvalDate = multi ? null : new Date().toISOString();
            const approvalRemarks = multi ? null : 'Auto-approved';
            const result = await this.db.transaction(async (trx) => {
                await trx
                    .delete(payroll_run_schema_1.payroll)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.employeeId, employeeId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollDate, payrollDate), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.companyId, companyId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true)))
                    .execute();
                const [inserted] = await trx
                    .insert(payroll_run_schema_1.payroll)
                    .values({
                    payrollRunId: runId,
                    employeeId,
                    companyId,
                    basic: '0.00',
                    housing: '0.00',
                    transport: '0.00',
                    grossSalary: grossSalary.toFixed(2),
                    pensionContribution: employeePension.toFixed(2),
                    employerPensionContribution: employerPension.toFixed(2),
                    bonuses: '0.00',
                    nhfContribution: nhf.toFixed(2),
                    payeTax: paye.toFixed(2),
                    customDeductions: '0.00',
                    totalDeductions: totalDeductions.toFixed(2),
                    taxableIncome: taxableIncome.toFixed(2),
                    netSalary: netSalary.toFixed(2),
                    salaryAdvance: '0.00',
                    payrollDate,
                    payrollMonth,
                    approvalStatus,
                    approvalDate,
                    approvalRemarks,
                    requestedBy: userId,
                    workflowId,
                    currentStep: multi ? 0 : 1,
                    isStarter: false,
                    isOffCycle: true,
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
                await trx.insert(payroll_ytd_schema_1.payrollYtd).values({
                    employeeId,
                    payrollMonth,
                    payrollDate,
                    payrollId: inserted.id,
                    companyId,
                    year: new Date().getFullYear(),
                    grossSalary: grossSalary.toFixed(2),
                    netSalary: netSalary.toFixed(2),
                    totalDeductions: totalDeductions.toFixed(2),
                    bonuses: '0.00',
                    PAYE: paye.toFixed(2),
                    pension: employeePension.toFixed(2),
                    employerPension: employerPension.toFixed(2),
                    nhf: nhf.toFixed(2),
                    basic: '0.00',
                    housing: '0.00',
                    transport: '0.00',
                });
                return {
                    ...inserted,
                    name: `${emp.firstName} ${emp.lastName}`,
                };
            });
            return result;
        }));
        return results;
    }
    async calculateAndPersistOffCycle(runId, user, payrollDate) {
        const payrollSettings = await this.payrollSettingsService.getAllPayrollSettings(user.companyId);
        const multi = payrollSettings.multi_level_approval;
        const chain = payrollSettings.approver_chain || '[]';
        const payrollRunId = runId;
        let [workflow] = await this.db
            .select()
            .from(approval_workflow_schema_1.approvalWorkflows)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(approval_workflow_schema_1.approvalWorkflows.companyId, user.companyId), (0, drizzle_orm_1.eq)(approval_workflow_schema_1.approvalWorkflows.entityId, payrollRunId)))
            .execute();
        if (!workflow) {
            [workflow] = await this.db
                .insert(approval_workflow_schema_1.approvalWorkflows)
                .values({
                name: 'Payroll Run',
                companyId: user.companyId,
                entityId: payrollRunId,
                entityDate: new Date(payrollDate).toISOString().split('T')[0],
            })
                .returning()
                .execute();
        }
        const workflowId = workflow.id;
        const existingSteps = await this.db
            .select()
            .from(approval_workflow_schema_1.approvalSteps)
            .where((0, drizzle_orm_1.eq)(approval_workflow_schema_1.approvalSteps.workflowId, workflowId))
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
                .insert(approval_workflow_schema_1.approvalSteps)
                .values(steps)
                .returning({
                id: approval_workflow_schema_1.approvalSteps.id,
            })
                .execute();
            await this.db
                .insert(payroll_run_schema_1.payrollApprovals)
                .values({
                payrollRunId,
                stepId: createdSteps[0].id,
                actorId: user.id,
                action: 'pending',
                remarks: 'Pending approval',
                createdAt: new Date(),
            })
                .execute();
        }
        if (!multi) {
            const [step] = await this.db
                .select()
                .from(approval_workflow_schema_1.approvalSteps)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(approval_workflow_schema_1.approvalSteps.workflowId, workflowId), (0, drizzle_orm_1.eq)(approval_workflow_schema_1.approvalSteps.sequence, 1)))
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
        return this.calculateOffCyclePayroll(runId, user.companyId, user.id, workflowId);
    }
    async create(createOffCycleDto, user) {
        const inProgressPayroll = await this.db
            .select()
            .from(off_cycle_schema_1.offCyclePayroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.companyId, user.companyId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollDate, createOffCycleDto.payrollDate)));
        const payrollRunId = inProgressPayroll.length
            ? inProgressPayroll[0].payrollRunId
            : (0, uuid_1.v4)();
        const existingOffCycle = await this.db
            .select()
            .from(off_cycle_schema_1.offCyclePayroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.companyId, user.companyId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, createOffCycleDto.employeeId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollDate, new Date(createOffCycleDto.payrollDate).toDateString()), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.type, createOffCycleDto.type)))
            .limit(1);
        if (existingOffCycle.length > 0) {
            throw new common_1.BadRequestException(`Off-cycle payroll already exists for employee ${createOffCycleDto.employeeId} on ${createOffCycleDto.payrollDate}`);
        }
        const [created] = await this.db
            .insert(off_cycle_schema_1.offCyclePayroll)
            .values({
            payrollRunId,
            companyId: user.companyId,
            employeeId: createOffCycleDto.employeeId,
            payrollDate: createOffCycleDto.payrollDate,
            type: createOffCycleDto.type,
            amount: createOffCycleDto.amount,
            taxable: createOffCycleDto.taxable ?? true,
            proratable: createOffCycleDto.proratable ?? false,
            notes: createOffCycleDto.notes,
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'create',
            entity: 'offCycle',
            entityId: created.id,
            details: 'Created new off-cycle payroll entry',
            userId: user.id,
            changes: {
                employeeId: created.employeeId,
                payrollDate: createOffCycleDto.payrollDate,
                type: createOffCycleDto.type,
                amount: createOffCycleDto.amount,
                taxable: createOffCycleDto.taxable,
                proratable: createOffCycleDto.proratable,
            },
        });
        return this.findAll(user.companyId, created.payrollDate);
    }
    findAll(companyId, payrollDate) {
        return this.db
            .select({
            id: off_cycle_schema_1.offCyclePayroll.id,
            employeeId: off_cycle_schema_1.offCyclePayroll.employeeId,
            type: off_cycle_schema_1.offCyclePayroll.type,
            amount: off_cycle_schema_1.offCyclePayroll.amount,
            taxable: off_cycle_schema_1.offCyclePayroll.taxable,
            proratable: off_cycle_schema_1.offCyclePayroll.proratable,
            payrollDate: off_cycle_schema_1.offCyclePayroll.payrollDate,
            notes: off_cycle_schema_1.offCyclePayroll.notes,
            payrollRunId: off_cycle_schema_1.offCyclePayroll.payrollRunId,
            name: (0, drizzle_orm_1.sql) `concat(${schema_1.employees.firstName}, ' ', ${schema_1.employees.lastName})`,
        })
            .from(off_cycle_schema_1.offCyclePayroll)
            .innerJoin(schema_1.employees, (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.employeeId, schema_1.employees.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.companyId, companyId), (0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.payrollDate, payrollDate)));
    }
    async findOne(id) {
        const [offCycle] = await this.db
            .select()
            .from(off_cycle_schema_1.offCyclePayroll)
            .where((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.id, id))
            .limit(1);
        if (!offCycle) {
            throw new common_1.BadRequestException(`Off-cycle payroll not found`);
        }
        return offCycle;
    }
    async remove(id, user) {
        const offCycle = await this.findOne(id);
        const deleted = await this.db
            .delete(off_cycle_schema_1.offCyclePayroll)
            .where((0, drizzle_orm_1.eq)(off_cycle_schema_1.offCyclePayroll.id, id))
            .execute();
        await this.db
            .delete(payroll_run_schema_1.payroll)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.payrollRunId, offCycle.payrollRunId), (0, drizzle_orm_1.eq)(payroll_run_schema_1.payroll.isOffCycle, true)))
            .execute();
        await this.auditService.logAction({
            action: 'delete',
            entity: 'offCycle',
            entityId: id,
            details: 'Deleted off-cycle payroll entry',
            userId: user.id,
            changes: {
                id,
                deleted: deleted.rowCount > 0,
            },
        });
    }
};
exports.OffCycleService = OffCycleService;
exports.OffCycleService = OffCycleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, audit_service_1.AuditService,
        payroll_settings_service_1.PayrollSettingsService])
], OffCycleService);
//# sourceMappingURL=off-cycle.service.js.map