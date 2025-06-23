"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxFilingDetails = exports.taxFilings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const payroll_run_schema_1 = require("./payroll-run.schema");
const schema_1 = require("../../../drizzle/schema");
exports.taxFilings = (0, pg_core_1.pgTable)('tax_filings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payrollId: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => payroll_run_schema_1.payroll.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    taxType: (0, pg_core_1.text)('tax_type').notNull(),
    payrollMonth: (0, pg_core_1.text)('payroll_month').notNull(),
    companyTin: (0, pg_core_1.text)('company_tin').notNull(),
    referenceNumber: (0, pg_core_1.text)('reference_number'),
    status: (0, pg_core_1.text)('status').default('pending'),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_tax_filings').on(table.companyId),
    (0, pg_core_1.index)('idx_tax_type_tax_filings').on(table.taxType),
    (0, pg_core_1.index)('idx_company_tin_tax_filings').on(table.companyTin),
    (0, pg_core_1.index)('idx_status_tax_filings').on(table.status),
]);
exports.taxFilingDetails = (0, pg_core_1.pgTable)('tax_filing_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    taxFilingId: (0, pg_core_1.uuid)('tax_filing_id')
        .notNull()
        .references(() => exports.taxFilings.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    basicSalary: (0, pg_core_1.decimal)('basic_salary', {
        precision: 10,
        scale: 2,
    }).notNull(),
    contributionAmount: (0, pg_core_1.decimal)('contribution_amount', {
        precision: 10,
        scale: 2,
    }).notNull(),
    taxableAmount: (0, pg_core_1.decimal)('taxable_amount', {
        precision: 10,
        scale: 2,
    }).notNull(),
    tin: (0, pg_core_1.text)('tin'),
    pensionPin: (0, pg_core_1.text)('pension_pin'),
    nhfNumber: (0, pg_core_1.text)('nhf_number'),
    referenceNumber: (0, pg_core_1.text)('reference_number'),
    employerContribution: (0, pg_core_1.decimal)('employer_contribution', {
        precision: 10,
        scale: 2,
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_tax_filing_id_tax_filing_details').on(table.taxFilingId),
    (0, pg_core_1.index)('idx_employee_id_tax_filing_details').on(table.employeeId),
    (0, pg_core_1.index)('idx_tin_tax_filing_details').on(table.tin),
]);
//# sourceMappingURL=tax.schema.js.map