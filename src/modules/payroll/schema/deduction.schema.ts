// src/drizzle/schema/deduction-types.schema.ts

import {
  pgTable,
  varchar,
  boolean,
  pgEnum,
  uuid,
  decimal,
  date,
  jsonb,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees } from 'src/drizzle/schema';

export const deductionTypes = pgTable(
  'deduction_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 100 }).notNull(), // e.g., 'UNION_DUES'
    systemDefined: boolean('system_defined').default(true).notNull(),
    requiresMembership: boolean('requires_membership').default(false).notNull(),
  },
  (t) => [
    index('deduction_types_name_idx').on(t.name),
    index('deduction_types_code_idx').on(t.code),
  ],
);

export const rateTypeEnum = pgEnum('rate_type', ['fixed', 'percentage']);

export const employeeDeductions = pgTable(
  'employee_deductions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    deductionTypeId: uuid('deduction_type_id')
      .notNull()
      .references(() => deductionTypes.id),

    rateType: rateTypeEnum('rate_type').notNull(),
    rateValue: decimal('rate_value', { precision: 10, scale: 2 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'), // nullable
    metadata: jsonb('metadata'),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (t) => [
    index('employee_deductions_employee_id_idx').on(t.employeeId),
    index('employee_deductions_deduction_type_id_idx').on(t.deductionTypeId),
    index('employee_deductions_rate_type_idx').on(t.rateType),
    index('employee_deductions_start_date_idx').on(t.startDate),
    index('employee_deductions_is_active_idx').on(t.isActive),
  ],
);

export const filingVoluntaryDeductions = pgTable(
  'filing_voluntary_deductions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    employeeName: varchar('employee_name', { length: 255 }).notNull(),
    deductionName: varchar('deduction_name', { length: 255 }).notNull(),

    payrollId: uuid('payroll_id').notNull(),
    payrollMonth: text('payroll_month').notNull(), // e.g. '2024-12'

    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('pending'), // e.g. 'pending', 'approved', 'rejected'
    createdAt: date('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('filing_voluntary_deductions_company_id_idx').on(t.companyId),
    index('filing_voluntary_deductions_employee_id_idx').on(t.employeeId),
    index('filing_voluntary_deductions_payroll_id_idx').on(t.payrollId),
    index('filing_voluntary_deductions_payroll_month_idx').on(t.payrollMonth),
    index('filing_voluntary_deductions_status_idx').on(t.status),
    index('filing_voluntary_deductions_created_at_idx').on(t.createdAt),
  ],
);
