// src/modules/core/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  index,
  boolean,
  text,
} from 'drizzle-orm/pg-core';
import {
  companyLocations,
  costCenters,
  departments,
  jobRoles,
  users,
} from 'src/drizzle/schema';
import { companies } from '../../company/schema/company.schema';
import { payGroups } from 'src/modules/payroll/schema/pay-groups.schema';

// Employee status
export const employeeStatus = pgEnum('employee_status', [
  'probation',
  'active',
  'on_leave',
  'resigned',
  'terminated',
  'onboarding',
  'inactive',
]);

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Core identifiers
    employeeNumber: varchar('employee_number', { length: 50 }).notNull(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // work-related info
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),

    jobRoleId: uuid('job_role_id').references(() => jobRoles.id, {
      onDelete: 'set null',
    }),

    managerId: uuid('manager_id').references(() => employees.id, {
      onDelete: 'set null',
    }),

    costCenterId: uuid('cost_center_id').references(() => costCenters.id, {
      onDelete: 'set null',
    }),

    locationId: uuid('company_location').references(() => companyLocations.id, {
      onDelete: 'set null',
    }),

    payGroupId: uuid('pay_group_id').references(() => payGroups.id, {
      onDelete: 'set null',
    }),

    // Employment-related info
    employmentStatus: employeeStatus('employment_status')
      .default('active')
      .notNull(),
    employmentStartDate: text('employment_start_date').notNull(),
    employmentEndDate: timestamp('employment_end_date'),

    confirmed: boolean('confirmed').default(true),
    probationEndDate: text('probation_end_date'),

    // Personal & contact info
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    // Tenant scope
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('employees_company_id_idx').on(t.companyId),
    index('employees_user_id_idx').on(t.userId),
    index('employees_department_id_idx').on(t.departmentId),
    index('employees_job_role_id_idx').on(t.jobRoleId),
    index('employees_manager_id_idx').on(t.managerId),
    index('employees_cost_center_id_idx').on(t.costCenterId),
    index('employees_location_id_idx').on(t.locationId),
    index('employees_pay_group_id_idx').on(t.payGroupId),
    index('employees_employment_status_idx').on(t.employmentStatus),
    index('employees_employment_start_date_idx').on(t.employmentStartDate),
    index('employees_probation_end_date_idx').on(t.probationEndDate),
    index('employees_first_name_idx').on(t.firstName),
    index('employees_last_name_idx').on(t.lastName),
    index('employees_created_at_idx').on(t.createdAt),
    index('employees_updated_at_idx').on(t.updatedAt),
  ],
);
