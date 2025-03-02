"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employee_tax_details = exports.employee_bank_details = exports.employees = exports.employee_groups = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
const department_schema_1 = require("./department.schema");
const users_schema_1 = require("./users.schema");
exports.employee_groups = (0, pg_core_1.pgTable)('employee_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    apply_paye: (0, pg_core_1.boolean)('apply_paye').default(false),
    apply_pension: (0, pg_core_1.boolean)('apply_pension').default(false),
    apply_nhf: (0, pg_core_1.boolean)('apply_nhf').default(false),
    apply_additional: (0, pg_core_1.boolean)('apply_additional').default(false),
    is_demo: (0, pg_core_1.boolean)('is_demo').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
}, (table) => [
    (0, pg_core_1.index)('idx_name_employee_groups').on(table.name),
    (0, pg_core_1.index)('idx_company_id_employees_groups').on(table.company_id),
]);
exports.employees = (0, pg_core_1.pgTable)('employees', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employee_number: (0, pg_core_1.integer)('employee_number').notNull().unique(),
    first_name: (0, pg_core_1.text)('first_name').notNull(),
    last_name: (0, pg_core_1.text)('last_name').notNull(),
    job_title: (0, pg_core_1.text)('job_title').notNull(),
    phone: (0, pg_core_1.text)('phone'),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    employment_status: (0, pg_core_1.text)('employment_status').notNull(),
    start_date: (0, pg_core_1.text)('start_date').notNull(),
    is_active: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    annual_gross: (0, pg_core_1.integer)('annual_gross').default(0),
    hourly_rate: (0, pg_core_1.integer)('hourly_rate').default(0),
    bonus: (0, pg_core_1.integer)('bonus').default(0),
    commission: (0, pg_core_1.integer)('commission').default(0),
    is_demo: (0, pg_core_1.boolean)('is_demo').default(false),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => users_schema_1.users.id, {
        onDelete: 'cascade',
    }),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    department_id: (0, pg_core_1.uuid)('department_id').references(() => department_schema_1.departments.id, {
        onDelete: 'cascade',
    }),
    group_id: (0, pg_core_1.uuid)('group_id').references(() => exports.employee_groups.id, {
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
    consolidated_relief_allowance: (0, pg_core_1.integer)('consolidated_relief_allowance').default(0),
    other_reliefs: (0, pg_core_1.integer)('other_reliefs').default(0),
    state_of_residence: (0, pg_core_1.text)('state_of_residence').notNull(),
    has_exemptions: (0, pg_core_1.boolean)('has_exemptions').default(false),
    additional_details: (0, pg_core_1.json)('additional_details').default('{}'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => exports.employees.id, { onDelete: 'cascade' }),
}, (table) => [
    (0, pg_core_1.index)('idx_employee_id_employee_tax_details').on(table.employee_id),
]);
//# sourceMappingURL=employee.schema.js.map