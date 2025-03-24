import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';
import { employees } from './employee.schema';
import { payroll } from './payroll.schema';

export const tax_filings = pgTable(
  'tax_filings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payroll_id: uuid('payroll_id') // Reference payroll
      .notNull()
      .references(() => payroll.id, { onDelete: 'cascade' }), // CASCADE DELETE

    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    tax_type: text('tax_type').notNull(), // 'NHF', 'PAYE', 'Pension', etc.
    payroll_month: date('payroll_month').notNull(),

    company_tin: text('company_tin').notNull(),
    reference_number: text('reference_number'),

    status: text('status').default('pending'),

    submitted_at: timestamp('submitted_at'), // Timestamp when filing is submitted
    approved_at: timestamp('approved_at'), // Timestamp when filing is approved

    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_company_id_tax_filings').on(table.company_id),
    index('idx_tax_type_tax_filings').on(table.tax_type),
    index('idx_company_tin_tax_filings').on(table.company_tin),
    index('idx_status_tax_filings').on(table.status),
  ],
);

export const tax_filing_details = pgTable(
  'tax_filing_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tax_filing_id: uuid('tax_filing_id')
      .notNull()
      .references(() => tax_filings.id, { onDelete: 'cascade' }),

    employee_id: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),

    basic_salary: integer('basic_salary').notNull(),
    contribution_amount: integer('contribution_amount').notNull(),
    taxable_amount: integer('taxable_amount').notNull(),

    tin: text('tin'),
    pension_pin: text('pension_pin'),
    nhf_number: text('nhf_number'),
    reference_number: text('reference_number'), // NHF/Pension reference number if applicable

    employer_contribution: integer('employer_contribution'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_tax_filing_id_tax_filing_details').on(table.tax_filing_id),
    index('idx_employee_id_tax_filing_details').on(table.employee_id),
    index('idx_tin_tax_filing_details').on(table.tin),
  ],
);
