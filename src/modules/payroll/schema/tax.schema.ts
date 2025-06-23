import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  decimal,
} from 'drizzle-orm/pg-core';
import { payroll } from './payroll-run.schema';
import { companies, employees } from 'src/drizzle/schema';

export const taxFilings = pgTable(
  'tax_filings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payrollId: uuid('payroll_id') // Reference payroll
      .notNull()
      .references(() => payroll.id, { onDelete: 'cascade' }), // CASCADE DELETE

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    taxType: text('tax_type').notNull(), // 'NHF', 'PAYE', 'Pension', etc.
    payrollMonth: text('payroll_month').notNull(),

    companyTin: text('company_tin').notNull(),
    referenceNumber: text('reference_number'),

    status: text('status').default('pending'),

    submittedAt: timestamp('submitted_at'), // Timestamp when filing is submitted
    approvedAt: timestamp('approved_at'), // Timestamp when filing is approved

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_company_id_tax_filings').on(table.companyId),
    index('idx_tax_type_tax_filings').on(table.taxType),
    index('idx_company_tin_tax_filings').on(table.companyTin),
    index('idx_status_tax_filings').on(table.status),
  ],
);

export const taxFilingDetails = pgTable(
  'tax_filing_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    taxFilingId: uuid('tax_filing_id')
      .notNull()
      .references(() => taxFilings.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),

    basicSalary: decimal('basic_salary', {
      precision: 10,
      scale: 2,
    }).notNull(),
    contributionAmount: decimal('contribution_amount', {
      precision: 10,
      scale: 2,
    }).notNull(),
    taxableAmount: decimal('taxable_amount', {
      precision: 10,
      scale: 2,
    }).notNull(),

    tin: text('tin'),
    pensionPin: text('pension_pin'),
    nhfNumber: text('nhf_number'),
    referenceNumber: text('reference_number'),

    employerContribution: decimal('employer_contribution', {
      precision: 10,
      scale: 2,
    }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_tax_filing_id_tax_filing_details').on(table.taxFilingId),
    index('idx_employee_id_tax_filing_details').on(table.employeeId),
    index('idx_tin_tax_filing_details').on(table.tin),
  ],
);
