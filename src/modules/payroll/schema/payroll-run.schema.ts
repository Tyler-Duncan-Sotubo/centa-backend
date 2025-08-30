import {
  pgTable,
  uuid,
  date,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { employees, companies, users } from 'src/drizzle/schema';
import {
  approvalSteps,
  approvalWorkflows,
} from '../../../company-settings/schema/approval-workflow.schema';

export const payroll = pgTable(
  'payroll',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payrollRunId: uuid('payroll_run_id').notNull(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Core Salary Components
    basic: decimal('basic', { precision: 15, scale: 2 }).notNull(),
    housing: decimal('housing', { precision: 15, scale: 2 }).notNull(),
    transport: decimal('transport', { precision: 15, scale: 2 }).notNull(),

    // Derived Salary Components
    grossSalary: decimal('gross_salary', { precision: 15, scale: 2 }).notNull(),

    // Pension Contributions
    pensionContribution: decimal('pension_contribution', {
      precision: 15,
      scale: 2,
    }).notNull(),
    employerPensionContribution: decimal('employer_pension_contribution', {
      precision: 15,
      scale: 2,
    }).notNull(),

    // Additions
    bonuses: decimal('bonuses', { precision: 15, scale: 2 }).default('0.00'),
    reimbursements: jsonb('reimbursements').default('[]'),

    salaryAdvance: decimal('salary_advance', {
      precision: 15,
      scale: 2,
    }).default('0.00'),

    // Deductions
    nhfContribution: decimal('nhf_contribution', {
      precision: 15,
      scale: 2,
    }).default('0.00'),
    payeTax: decimal('paye_tax', { precision: 15, scale: 2 }).notNull(),
    customDeductions: decimal('custom_deductions', {
      precision: 15,
      scale: 2,
    }).default('0.00'),
    voluntaryDeductions: jsonb('voluntary_deductions')
      .notNull()
      .default({ total: '0.00', breakdown: [] }),
    totalDeductions: decimal('total_deductions', {
      precision: 15,
      scale: 2,
    }).notNull(),

    // Final Calculated Salary
    netSalary: decimal('net_salary', { precision: 15, scale: 2 }).notNull(),
    taxableIncome: decimal('taxable_income', {
      precision: 15,
      scale: 2,
    }).notNull(),

    // Payroll Metadata
    payrollDate: date('payroll_date').notNull(),
    payrollMonth: text('payroll_month').notNull(),

    // Payment Information
    paymentStatus: text('payment_status').default('pending'),
    paymentDate: date('payment_date'),
    paymentReference: text('payment_reference').default(''),

    // Approval Information
    approvalDate: date('approval_date'),
    approvalRemarks: text('approval_remarks').default(''),

    // Leavers and Starters Flag
    isStarter: boolean('is_starter').default(true),
    isLeaver: boolean('is_leaver').default(false),

    isOffCycle: boolean('is_off_cycle').default(false),
    requestedBy: uuid('requested_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    requestedAt: timestamp('requested_at').notNull().defaultNow(),

    approvalStatus: text('approval_status').notNull().default('pending'),
    lastApprovalAt: timestamp('last_approval_at'),
    lastApprovedBy: uuid('last_approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => approvalWorkflows.id, { onDelete: 'restrict' }),

    currentStep: integer('current_step').notNull().default(1),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('payroll_payroll_run_id_idx').on(t.payrollRunId),
    index('payroll_employee_id_idx').on(t.employeeId),
    index('payroll_company_id_idx').on(t.companyId),
    index('payroll_user_id_idx').on(t.userId),
    index('payroll_payroll_date_idx').on(t.payrollDate),
    index('payroll_payroll_month_idx').on(t.payrollMonth),
    index('payroll_payment_status_idx').on(t.paymentStatus),
    index('payroll_requested_by_idx').on(t.requestedBy),
    index('payroll_requested_at_idx').on(t.requestedAt),
    index('payroll_approval_status_idx').on(t.approvalStatus),
    index('payroll_last_approved_by_idx').on(t.lastApprovedBy),
    index('payroll_workflow_id_idx').on(t.workflowId),
    index('payroll_current_step_idx').on(t.currentStep),
    index('payroll_created_at_idx').on(t.createdAt),
    unique('payroll_emp_date_co_uniq').on(
      t.employeeId,
      t.payrollDate,
      t.companyId,
    ),
    index('payroll_emp_date_co_idx').on(
      t.employeeId,
      t.payrollDate,
      t.companyId,
    ),
    index('payroll_co_date_idx').on(t.companyId, t.payrollDate),
    index('payroll_run_emp_idx').on(t.payrollRunId, t.employeeId),
    index('payroll_co_month_idx').on(t.companyId, t.payrollMonth),
    index('payroll_co_status_date_idx').on(
      t.companyId,
      t.approvalStatus,
      t.payrollDate,
    ),
    index('payroll_workflow_step_idx').on(t.workflowId, t.currentStep),
  ],
);

export const payrollApprovals = pgTable(
  'payroll_approvals',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payrollRunId: uuid('payroll_run_id').notNull(),

    stepId: uuid('step_id')
      .notNull()
      .references(() => approvalSteps.id, { onDelete: 'cascade' }),

    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),

    action: text('action').notNull(),
    remarks: text('remarks'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('payroll_approvals_payroll_run_id_idx').on(t.payrollRunId),
    index('payroll_approvals_step_id_idx').on(t.stepId),
    index('payroll_approvals_actor_id_idx').on(t.actorId),
    index('payroll_approvals_created_at_idx').on(t.createdAt),
  ],
);
