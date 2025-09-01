import {
  date,
  pgTable,
  text,
  uuid,
  index,
  unique,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { employees, companies } from 'src/drizzle/schema';
import { payroll } from './payroll-run.schema';

export const paySlips = pgTable(
  'payslips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    issuedAt: date('issued_at').defaultNow(), // Timestamp for when the payslip is generated
    payrollMonth: text('payroll_month').notNull(), // YYYY-MM format for tracking the payroll period
    slipStatus: text('slip_status').default('issued'), // "issued", "pending", "reissued"
    employerRemarks: text('employer_remarks').default(''),
    pdfUrl: text('pdf_url').default(''), // URL to the PDF file
    payrollId: uuid('payroll_id')
      .notNull()
      .references(() => payroll.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    checksum: text('checksum'), // sha256 of the computed slip payload
    revision: integer('revision').notNull().default(1),
    reissuedAt: timestamp('reissued_at'),
  },
  (t) => [
    index('payslips_payroll_id_idx').on(t.payrollId),
    index('payslips_employee_id_idx').on(t.employeeId),
    index('payslips_company_id_idx').on(t.companyId),
    index('payslips_payroll_month_idx').on(t.payrollMonth),
    index('payslips_slip_status_idx').on(t.slipStatus),
    index('payslips_issued_at_idx').on(t.issuedAt),
    unique('payslips_employee_payroll_uk').on(t.employeeId, t.payrollId),
  ],
);
