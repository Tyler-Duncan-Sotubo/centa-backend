import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  text,
  boolean,
  decimal,
  index,
} from 'drizzle-orm/pg-core';
import { companies, companyLocations, employees } from 'src/drizzle/schema';

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    internalId: varchar('internal_id', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    modelName: varchar('model_name', { length: 255 }),
    color: varchar('color', { length: 255 }),
    specs: text('specs'),
    category: varchar('category', { length: 255 }).notNull(),
    manufacturer: varchar('manufacturer', { length: 255 }),
    serialNumber: varchar('serial_number', { length: 255 }).notNull(),

    purchasePrice: decimal('purchase_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
    purchaseDate: date('purchase_date').notNull(),
    depreciationMethod: varchar('depreciation_method', { length: 50 }),
    warrantyExpiry: date('warranty_expiry'),

    lendDate: date('lend_date'),
    returnDate: date('return_date'),
    usefulLifeYears: integer('useful_life_years').notNull().default(3),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    employeeId: uuid('employee_id').references(() => employees.id),

    locationId: uuid('location_id')
      .notNull()
      .references(() => companyLocations.id),

    status: varchar('status').default('available').notNull(),

    createdAt: date('created_at').defaultNow(),
    updatedAt: date('updated_at').defaultNow(),
    isDeleted: boolean('is_deleted').default(false),
  },
  (t) => [
    index('assets_internal_id_idx').on(t.internalId),
    index('assets_company_id_idx').on(t.companyId),
    index('assets_location_id_idx').on(t.locationId),
    index('assets_employee_id_idx').on(t.employeeId),
    index('assets_category_idx').on(t.category),
    index('assets_status_idx').on(t.status),
    index('assets_purchase_date_idx').on(t.purchaseDate),
  ],
);
