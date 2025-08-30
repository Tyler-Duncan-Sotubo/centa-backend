"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollApprovals = exports.payroll = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const approval_workflow_schema_1 = require("../../../company-settings/schema/approval-workflow.schema");
exports.payroll = (0, pg_core_1.pgTable)('payroll', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payrollRunId: (0, pg_core_1.uuid)('payroll_run_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id').references(() => schema_1.users.id, {
        onDelete: 'set null',
    }),
    basic: (0, pg_core_1.decimal)('basic', { precision: 15, scale: 2 }).notNull(),
    housing: (0, pg_core_1.decimal)('housing', { precision: 15, scale: 2 }).notNull(),
    transport: (0, pg_core_1.decimal)('transport', { precision: 15, scale: 2 }).notNull(),
    grossSalary: (0, pg_core_1.decimal)('gross_salary', { precision: 15, scale: 2 }).notNull(),
    pensionContribution: (0, pg_core_1.decimal)('pension_contribution', {
        precision: 15,
        scale: 2,
    }).notNull(),
    employerPensionContribution: (0, pg_core_1.decimal)('employer_pension_contribution', {
        precision: 15,
        scale: 2,
    }).notNull(),
    bonuses: (0, pg_core_1.decimal)('bonuses', { precision: 15, scale: 2 }).default('0.00'),
    reimbursements: (0, pg_core_1.jsonb)('reimbursements').default('[]'),
    salaryAdvance: (0, pg_core_1.decimal)('salary_advance', {
        precision: 15,
        scale: 2,
    }).default('0.00'),
    nhfContribution: (0, pg_core_1.decimal)('nhf_contribution', {
        precision: 15,
        scale: 2,
    }).default('0.00'),
    payeTax: (0, pg_core_1.decimal)('paye_tax', { precision: 15, scale: 2 }).notNull(),
    customDeductions: (0, pg_core_1.decimal)('custom_deductions', {
        precision: 15,
        scale: 2,
    }).default('0.00'),
    voluntaryDeductions: (0, pg_core_1.jsonb)('voluntary_deductions')
        .notNull()
        .default({ total: '0.00', breakdown: [] }),
    totalDeductions: (0, pg_core_1.decimal)('total_deductions', {
        precision: 15,
        scale: 2,
    }).notNull(),
    netSalary: (0, pg_core_1.decimal)('net_salary', { precision: 15, scale: 2 }).notNull(),
    taxableIncome: (0, pg_core_1.decimal)('taxable_income', {
        precision: 15,
        scale: 2,
    }).notNull(),
    payrollDate: (0, pg_core_1.date)('payroll_date').notNull(),
    payrollMonth: (0, pg_core_1.text)('payroll_month').notNull(),
    paymentStatus: (0, pg_core_1.text)('payment_status').default('pending'),
    paymentDate: (0, pg_core_1.date)('payment_date'),
    paymentReference: (0, pg_core_1.text)('payment_reference').default(''),
    approvalDate: (0, pg_core_1.date)('approval_date'),
    approvalRemarks: (0, pg_core_1.text)('approval_remarks').default(''),
    isStarter: (0, pg_core_1.boolean)('is_starter').default(true),
    isLeaver: (0, pg_core_1.boolean)('is_leaver').default(false),
    isOffCycle: (0, pg_core_1.boolean)('is_off_cycle').default(false),
    requestedBy: (0, pg_core_1.uuid)('requested_by')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'set null' }),
    requestedAt: (0, pg_core_1.timestamp)('requested_at').notNull().defaultNow(),
    approvalStatus: (0, pg_core_1.text)('approval_status').notNull().default('pending'),
    lastApprovalAt: (0, pg_core_1.timestamp)('last_approval_at'),
    lastApprovedBy: (0, pg_core_1.uuid)('last_approved_by').references(() => schema_1.users.id, {
        onDelete: 'set null',
    }),
    workflowId: (0, pg_core_1.uuid)('workflow_id')
        .notNull()
        .references(() => approval_workflow_schema_1.approvalWorkflows.id, { onDelete: 'restrict' }),
    currentStep: (0, pg_core_1.integer)('current_step').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('payroll_payroll_run_id_idx').on(t.payrollRunId),
    (0, pg_core_1.index)('payroll_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('payroll_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('payroll_user_id_idx').on(t.userId),
    (0, pg_core_1.index)('payroll_payroll_date_idx').on(t.payrollDate),
    (0, pg_core_1.index)('payroll_payroll_month_idx').on(t.payrollMonth),
    (0, pg_core_1.index)('payroll_payment_status_idx').on(t.paymentStatus),
    (0, pg_core_1.index)('payroll_requested_by_idx').on(t.requestedBy),
    (0, pg_core_1.index)('payroll_requested_at_idx').on(t.requestedAt),
    (0, pg_core_1.index)('payroll_approval_status_idx').on(t.approvalStatus),
    (0, pg_core_1.index)('payroll_last_approved_by_idx').on(t.lastApprovedBy),
    (0, pg_core_1.index)('payroll_workflow_id_idx').on(t.workflowId),
    (0, pg_core_1.index)('payroll_current_step_idx').on(t.currentStep),
    (0, pg_core_1.index)('payroll_created_at_idx').on(t.createdAt),
    (0, pg_core_1.unique)('payroll_emp_date_co_uniq').on(t.employeeId, t.payrollDate, t.companyId),
    (0, pg_core_1.index)('payroll_emp_date_co_idx').on(t.employeeId, t.payrollDate, t.companyId),
    (0, pg_core_1.index)('payroll_co_date_idx').on(t.companyId, t.payrollDate),
    (0, pg_core_1.index)('payroll_run_emp_idx').on(t.payrollRunId, t.employeeId),
    (0, pg_core_1.index)('payroll_co_month_idx').on(t.companyId, t.payrollMonth),
    (0, pg_core_1.index)('payroll_co_status_date_idx').on(t.companyId, t.approvalStatus, t.payrollDate),
    (0, pg_core_1.index)('payroll_workflow_step_idx').on(t.workflowId, t.currentStep),
]);
exports.payrollApprovals = (0, pg_core_1.pgTable)('payroll_approvals', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payrollRunId: (0, pg_core_1.uuid)('payroll_run_id').notNull(),
    stepId: (0, pg_core_1.uuid)('step_id')
        .notNull()
        .references(() => approval_workflow_schema_1.approvalSteps.id, { onDelete: 'cascade' }),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'set null' }),
    action: (0, pg_core_1.text)('action').notNull(),
    remarks: (0, pg_core_1.text)('remarks'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('payroll_approvals_payroll_run_id_idx').on(t.payrollRunId),
    (0, pg_core_1.index)('payroll_approvals_step_id_idx').on(t.stepId),
    (0, pg_core_1.index)('payroll_approvals_actor_id_idx').on(t.actorId),
    (0, pg_core_1.index)('payroll_approvals_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=payroll-run.schema.js.map