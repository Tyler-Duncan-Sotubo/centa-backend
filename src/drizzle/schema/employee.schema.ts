import {
  pgTable,
  uuid,
  timestamp,
  index,
  text,
  boolean,
  integer,
  json,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';
import { departments } from './department.schema';
import { users } from './users.schema';

// Employee Group Table
export const employee_groups = pgTable(
  'employee_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull().unique(), // group name must be unique

    // Boolean flags that indicate whether a tax deduction applies
    apply_paye: boolean('apply_paye').default(false),
    apply_pension: boolean('apply_pension').default(false),
    apply_nhf: boolean('apply_nhf').default(false),
    apply_additional: boolean('apply_additional').default(false),
    is_demo: boolean('is_demo').default(false),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_name_employee_groups').on(table.name),
    index('idx_company_id_employees_groups').on(table.company_id),
  ],
);

// Employee Table
export const employees = pgTable(
  'employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employee_number: integer('employee_number').notNull().unique(),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    job_title: text('job_title').notNull(),
    phone: text('phone'),
    email: text('email').notNull().unique(),
    employment_status: text('employment_status').notNull(),
    start_date: text('start_date').notNull(),
    is_active: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    annual_gross: integer('annual_gross').default(0),
    hourly_rate: integer('hourly_rate').default(0),
    bonus: integer('bonus').default(0),
    commission: integer('commission').default(0),
    is_demo: boolean('is_demo').default(false),

    // Foreign keys with ON DELETE CASCADE
    user_id: uuid('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    department_id: uuid('department_id').references(() => departments.id, {
      onDelete: 'cascade',
    }),

    group_id: uuid('group_id').references(() => employee_groups.id, {
      onDelete: 'cascade',
    }),
  },
  (table) => [
    index('idx_company_id_employees').on(table.company_id),
    index('idx_department_id_employees').on(table.department_id),
    index('idx_user_id_employees').on(table.user_id),
  ],
);

// Employee Bank Details Table
export const employee_bank_details = pgTable(
  'employee_bank_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bank_account_number: text('bank_account_number'),
    bank_account_name: text('bank_account_name'),
    bank_name: text('bank_name'),

    employee_id: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_employee_id_employee_bank_details').on(table.employee_id),
  ],
);

// Employee Tax Details Table
export const employee_tax_details = pgTable(
  'employee_tax_details',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tin: text('tin').notNull().unique(),
    consolidated_relief_allowance: integer(
      'consolidated_relief_allowance',
    ).default(0),
    other_reliefs: integer('other_reliefs').default(0),
    state_of_residence: text('state_of_residence').notNull(),
    has_exemptions: boolean('has_exemptions').default(false),
    additional_details: json('additional_details').default('{}'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    employee_id: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_employee_id_employee_tax_details').on(table.employee_id),
  ],
);
