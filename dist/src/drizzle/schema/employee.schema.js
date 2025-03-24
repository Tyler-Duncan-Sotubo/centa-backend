"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employee_tax_details = exports.employee_bank_details = exports.employees = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
const department_schema_1 = require("./department.schema");
const users_schema_1 = require("./users.schema");
const payroll_schema_1 = require("./payroll.schema");
exports.employees = (0, pg_core_1.pgTable)('employees', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employee_number: (0, pg_core_1.text)('employee_number'),
    first_name: (0, pg_core_1.text)('first_name').notNull(),
    last_name: (0, pg_core_1.text)('last_name').notNull(),
    job_title: (0, pg_core_1.text)('job_title').notNull(),
    phone: (0, pg_core_1.text)('phone'),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    employment_status: (0, pg_core_1.text)('employment_status').default('active'),
    start_date: (0, pg_core_1.text)('start_date').notNull(),
    is_active: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    annual_gross: (0, pg_core_1.integer)('annual_gross').default(0),
    bonus: (0, pg_core_1.integer)('bonus').default(0),
    commission: (0, pg_core_1.integer)('commission').default(0),
    apply_nhf: (0, pg_core_1.boolean)('apply_nhf').default(false),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => users_schema_1.users.id, {
        onDelete: 'cascade',
    }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    department_id: (0, pg_core_1.uuid)('department_id').references(() => department_schema_1.departments.id, {
        onDelete: 'cascade',
    }),
    group_id: (0, pg_core_1.uuid)('group_id').references(() => payroll_schema_1.payGroups.id, {
        onDelete: 'cascade',
    }),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_employees').on(table.company_id),
    (0, pg_core_1.index)('idx_department_id_employees').on(table.department_id),
    (0, pg_core_1.index)('idx_user_id_employees').on(table.user_id),
]);
exports.employee_bank_details = (0, pg_core_1.pgTable)('employee_bank_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    bank_account_number: (0, pg_core_1.text)('bank_account_number'),
    bank_account_name: (0, pg_core_1.text)('bank_account_name'),
    bank_name: (0, pg_core_1.text)('bank_name'),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => exports.employees.id, { onDelete: 'cascade' }),
}, (table) => [
    (0, pg_core_1.index)('idx_employee_id_employee_bank_details').on(table.employee_id),
]);
exports.employee_tax_details = (0, pg_core_1.pgTable)('employee_tax_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    tin: (0, pg_core_1.text)('tin').notNull().unique(),
    pension_pin: (0, pg_core_1.text)('pension_pin'),
    nhf_number: (0, pg_core_1.text)('nhf_number'),
    consolidated_relief_allowance: (0, pg_core_1.integer)('consolidated_relief_allowance').default(0),
    state_of_residence: (0, pg_core_1.text)('state_of_residence').default('Lagos'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => exports.employees.id, { onDelete: 'cascade' }),
}, (table) => [
    (0, pg_core_1.index)('idx_employee_id_employee_tax_details').on(table.employee_id),
]);
//# sourceMappingURL=employee.schema.js.map