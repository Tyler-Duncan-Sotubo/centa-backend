"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paySlips = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const payroll_run_schema_1 = require("./payroll-run.schema");
exports.paySlips = (0, pg_core_1.pgTable)('payslips', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    issuedAt: (0, pg_core_1.date)('issued_at').defaultNow(),
    payrollMonth: (0, pg_core_1.text)('payroll_month').notNull(),
    slipStatus: (0, pg_core_1.text)('slip_status').default('issued'),
    employerRemarks: (0, pg_core_1.text)('employer_remarks').default(''),
    pdfUrl: (0, pg_core_1.text)('pdf_url').default(''),
    payrollId: (0, pg_core_1.uuid)('payroll_id')
        .notNull()
        .references(() => payroll_run_schema_1.payroll.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    checksum: (0, pg_core_1.text)('checksum'),
    revision: (0, pg_core_1.integer)('revision').notNull().default(1),
    reissuedAt: (0, pg_core_1.timestamp)('reissued_at'),
}, (t) => [
    (0, pg_core_1.index)('payslips_payroll_id_idx').on(t.payrollId),
    (0, pg_core_1.index)('payslips_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('payslips_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('payslips_payroll_month_idx').on(t.payrollMonth),
    (0, pg_core_1.index)('payslips_slip_status_idx').on(t.slipStatus),
    (0, pg_core_1.index)('payslips_issued_at_idx').on(t.issuedAt),
    (0, pg_core_1.unique)('payslips_employee_payroll_uk').on(t.employeeId, t.payrollId),
]);
//# sourceMappingURL=payslip.schema.js.map