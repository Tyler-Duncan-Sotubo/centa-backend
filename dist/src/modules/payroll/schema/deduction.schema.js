"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filingVoluntaryDeductions = exports.employeeDeductions = exports.rateTypeEnum = exports.deductionTypes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.deductionTypes = (0, pg_core_1.pgTable)('deduction_types', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 100 }).notNull(),
    systemDefined: (0, pg_core_1.boolean)('system_defined').default(true).notNull(),
    requiresMembership: (0, pg_core_1.boolean)('requires_membership').default(false).notNull(),
}, (t) => [
    (0, pg_core_1.index)('deduction_types_name_idx').on(t.name),
    (0, pg_core_1.index)('deduction_types_code_idx').on(t.code),
]);
exports.rateTypeEnum = (0, pg_core_1.pgEnum)('rate_type', ['fixed', 'percentage']);
exports.employeeDeductions = (0, pg_core_1.pgTable)('employee_deductions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    deductionTypeId: (0, pg_core_1.uuid)('deduction_type_id')
        .notNull()
        .references(() => exports.deductionTypes.id),
    rateType: (0, exports.rateTypeEnum)('rate_type').notNull(),
    rateValue: (0, pg_core_1.decimal)('rate_value', { precision: 10, scale: 2 }).notNull(),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
}, (t) => [
    (0, pg_core_1.index)('employee_deductions_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('employee_deductions_deduction_type_id_idx').on(t.deductionTypeId),
    (0, pg_core_1.index)('employee_deductions_rate_type_idx').on(t.rateType),
    (0, pg_core_1.index)('employee_deductions_start_date_idx').on(t.startDate),
    (0, pg_core_1.index)('employee_deductions_is_active_idx').on(t.isActive),
]);
exports.filingVoluntaryDeductions = (0, pg_core_1.pgTable)('filing_voluntary_deductions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    employeeName: (0, pg_core_1.varchar)('employee_name', { length: 255 }).notNull(),
    deductionName: (0, pg_core_1.varchar)('deduction_name', { length: 255 }).notNull(),
    payrollId: (0, pg_core_1.uuid)('payroll_id').notNull(),
    payrollMonth: (0, pg_core_1.text)('payroll_month').notNull(),
    amount: (0, pg_core_1.decimal)('amount', { precision: 12, scale: 2 }).notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    createdAt: (0, pg_core_1.date)('created_at').defaultNow().notNull(),
}, (t) => [
    (0, pg_core_1.index)('filing_voluntary_deductions_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('filing_voluntary_deductions_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('filing_voluntary_deductions_payroll_id_idx').on(t.payrollId),
    (0, pg_core_1.index)('filing_voluntary_deductions_payroll_month_idx').on(t.payrollMonth),
    (0, pg_core_1.index)('filing_voluntary_deductions_status_idx').on(t.status),
    (0, pg_core_1.index)('filing_voluntary_deductions_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=deduction.schema.js.map