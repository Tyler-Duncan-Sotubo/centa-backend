"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.company_files = exports.company_tax_details = exports.company_contact = exports.companies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    country: (0, pg_core_1.text)('country').notNull(),
    address: (0, pg_core_1.text)('address'),
    city: (0, pg_core_1.text)('city'),
    postal_code: (0, pg_core_1.text)('postal_code'),
    industry: (0, pg_core_1.text)('industry'),
    registration_number: (0, pg_core_1.text)('registration_number').unique(),
    phone_number: (0, pg_core_1.text)('phone_number'),
    email: (0, pg_core_1.text)('email'),
    logo_url: (0, pg_core_1.text)('logo_url'),
    pay_frequency: (0, pg_core_1.text)('pay_frequency').notNull().default('monthly'),
    pay_schedule: (0, pg_core_1.jsonb)('pay_schedule'),
    time_zone: (0, pg_core_1.text)('time_zone').notNull().default('UTC'),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_name').on(table.name),
    (0, pg_core_1.index)('idx_registration_number').on(table.registration_number),
    (0, pg_core_1.index)('idx_country').on(table.country),
]);
exports.company_contact = (0, pg_core_1.pgTable)('company_contact', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    position: (0, pg_core_1.text)('position'),
    email: (0, pg_core_1.text)('email').notNull(),
    phone: (0, pg_core_1.text)('phone'),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => exports.companies.id, { onDelete: 'cascade' }),
}, (table) => [(0, pg_core_1.index)('idx_company_id_company_contact').on(table.company_id)]);
exports.company_tax_details = (0, pg_core_1.pgTable)('company_tax_details', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => exports.companies.id, { onDelete: 'cascade' }),
    tin: (0, pg_core_1.text)('tin').notNull(),
    vat_number: (0, pg_core_1.text)('vat_number'),
    nhf_code: (0, pg_core_1.text)('nhf_code'),
    pension_code: (0, pg_core_1.text)('pension_code'),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_tax_details').on(table.company_id),
    (0, pg_core_1.index)('idx_tin_tax_details').on(table.tin),
]);
exports.company_files = (0, pg_core_1.pgTable)('company_files', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    category: (0, pg_core_1.text)('category').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => exports.companies.id, { onDelete: 'cascade' }),
    employee_id: (0, pg_core_1.uuid)('employee_id').references(() => employee_schema_1.employees.id, {
        onDelete: 'set null',
    }),
}, (table) => [
    (0, pg_core_1.index)('idx_company_id_company_files').on(table.company_id),
    (0, pg_core_1.index)('idx_employee_id_company_files').on(table.employee_id),
]);
//# sourceMappingURL=company.schema.js.map