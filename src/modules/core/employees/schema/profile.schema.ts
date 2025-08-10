// src/modules/core/employees/profile/profile.schema.ts

import {
  pgTable,
  uuid,
  date,
  text,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { employees } from './employee.schema';

export const employeeProfiles = pgTable(
  'employee_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    maritalStatus: varchar('marital_status', { length: 20 }),
    address: text('address'),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    phone: text('phone'),
    emergencyName: varchar('emergency_contact_name', { length: 100 }),
    emergencyPhone: text('emergency_contact_phone'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),

    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
  },
  (t) => [
    index('employee_profiles_employee_id_idx').on(t.employeeId),
    index('employee_profiles_date_of_birth_idx').on(t.dateOfBirth),
    index('employee_profiles_gender_idx').on(t.gender),
    index('employee_profiles_marital_status_idx').on(t.maritalStatus),
    index('employee_profiles_state_idx').on(t.state),
    index('employee_profiles_country_idx').on(t.country),
    index('employee_profiles_created_at_idx').on(t.createdAt),
  ],
);
