import {
  pgTable,
  uuid,
  timestamp,
  index,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';

// Companies Table
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(), // Ensure unique company names
    country: text('country').notNull(), // Enforce required fields for reports
    address: text('address'),
    city: text('city'),
    postal_code: text('postal_code'),
    industry: text('industry'),
    registration_number: text('registration_number').unique(),
    phone_number: text('phone_number'),
    email: text('email'),

    logo_url: text('logo_url'), // Store company logo URL for branding
    pay_frequency: text('pay_frequency').notNull().default('monthly'),
    pay_schedule: jsonb('pay_schedule'),
    time_zone: text('time_zone').notNull().default('UTC'), // Ensure consistency in payroll calculations

    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').defaultNow().notNull(), // Track updates
  },
  (table) => [
    index('idx_company_name').on(table.name), // Index for faster name lookups
    index('idx_registration_number').on(table.registration_number), // Index for quick lookups by reg number
    index('idx_country').on(table.country), // Optimize queries by country
  ],
);

// Company Contact Table
export const company_contact = pgTable(
  'company_contact',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    position: text('position'),
    email: text('email').notNull(),
    phone: text('phone'),

    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }), // ON DELETE CASCADE
  },
  (table) => [index('idx_company_id_company_contact').on(table.company_id)],
);

export const company_tax_details = pgTable(
  'company_tax_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }), // Foreign key reference to companies

    tin: text('tin').notNull(), // Tax Identification Number
    vat_number: text('vat_number'), // VAT Registration Number
    nhf_code: text('nhf_code'), // NHF Contribution Code
    pension_code: text('pension_code'), // Pension Scheme Code

    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    index('idx_company_id_tax_details').on(table.company_id),
    index('idx_tin_tax_details').on(table.tin),
  ],
);

// Company Files Table
export const company_files = pgTable(
  'company_files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    type: text('type').notNull(), // 'employee_upload', 'payroll_file', 'tax_form'
    category: text('category').notNull(), // More granular categorization
    created_at: timestamp('created_at').defaultNow(),

    // Foreign keys for relationships
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employee_id: uuid('employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }), // Nullable for company-level files
  },
  (table) => [
    index('idx_company_id_company_files').on(table.company_id),
    index('idx_employee_id_company_files').on(table.employee_id),
  ],
);

export type CompanyContactType = typeof company_contact.$inferSelect;
export type CompanyType = typeof companies.$inferSelect;
