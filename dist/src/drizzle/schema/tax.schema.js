"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tax_filing_details = exports.tax_filings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
const employee_schema_1 = require("./employee.schema");
const payroll_schema_1 = require("./payroll.schema");
exports.tax_filings = (0, pg_core_1.pgTable)('tax_filings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payroll_id: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => payroll_schema_1.payroll.id, { onDelete: 'cascade' }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    tax_type: (0, pg_core_1.text)('tax_type').notNull(),
    payroll_month: (0, pg_core_1.date)('payroll_month').notNull(),
    company_tin: (0, pg_core_1.text)('company_tin').notNull(),
    reference_number: (0, pg_core_1.text)('reference_number'),
    status: (0, pg_core_1.text)('status').default('pending'),
    submitted_at: (0, pg_core_1.timestamp)('submitted_at'),
    approved_at: (0, pg_core_1.timestamp)('approved_at'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_tax_filings').on(table.company_id),
    (0, pg_core_1.index)('idx_tax_type_tax_filings').on(table.tax_type),
    (0, pg_core_1.index)('idx_company_tin_tax_filings').on(table.company_tin),
    (0, pg_core_1.index)('idx_status_tax_filings').on(table.status),
]);
exports.tax_filing_details = (0, pg_core_1.pgTable)('tax_filing_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    tax_filing_id: (0, pg_core_1.uuid)('tax_filing_id')
        .notNull()
        .references(() => exports.tax_filings.id, { onDelete: 'cascade' }),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    basic_salary: (0, pg_core_1.decimal)('basic_salary', {
        precision: 10,
        scale: 2,
    }).notNull(),
    contribution_amount: (0, pg_core_1.decimal)('contribution_amount', {
        precision: 10,
        scale: 2,
    }).notNull(),
    taxable_amount: (0, pg_core_1.decimal)('taxable_amount', {
        precision: 10,
        scale: 2,
    }).notNull(),
    tin: (0, pg_core_1.text)('tin'),
    reference_number: (0, pg_core_1.text)('reference_number'),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_tax_filing_id_tax_filing_details').on(table.tax_filing_id),
    (0, pg_core_1.index)('idx_employee_id_tax_filing_details').on(table.employee_id),
    (0, pg_core_1.index)('idx_tin_tax_filing_details').on(table.tin),
]);
//# sourceMappingURL=tax.schema.js.map