import {
  boolean,
  doublePrecision,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

export const companyLocations = pgTable(
  'company_locations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),

    isPrimary: boolean('is_primary').default(false),

    name: varchar('name', { length: 255 }).notNull(),
    street: varchar('street', { length: 255 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    timeZone: varchar('time_zone', { length: 50 }),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),

    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),

    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('idx_company_locations_companyId').on(t.companyId)],
);
