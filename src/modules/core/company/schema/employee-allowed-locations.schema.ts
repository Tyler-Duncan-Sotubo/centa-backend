import {
  pgTable,
  uuid,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { companyLocations, employees } from 'src/drizzle/schema';

export const employeeAllowedLocations = pgTable(
  'employee_allowed_locations',
  {
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    locationId: uuid('location_id')
      .notNull()
      .references(() => companyLocations.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.employeeId, t.locationId] }),

    index('employee_allowed_locations_employee_idx').on(t.employeeId),
    index('employee_allowed_locations_location_idx').on(t.locationId),
  ],
);
