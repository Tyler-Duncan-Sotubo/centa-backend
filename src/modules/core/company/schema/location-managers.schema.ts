import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { employees } from '../../schema';
import { companyLocations } from './company-location.schema';

export const locationManagers = pgTable('location_managers', {
  id: uuid('id').defaultRandom().primaryKey(),

  locationId: uuid('location_id')
    .references(() => companyLocations.id, { onDelete: 'cascade' })
    .notNull(),

  managerId: uuid('manager_id')
    .references(() => employees.id, { onDelete: 'cascade' })
    .notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});
