import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    name: varchar('name', { length: 100 }).notNull(),
    date: date('date').notNull(),
    year: text('year').notNull(),
    type: text('type').notNull(),

    country: varchar('country', { length: 100 }),
    countryCode: varchar('country_code', { length: 5 }),
    isWorkingDayOverride: boolean('is_working_day_override').default(false),
    source: varchar('source', { length: 50 }).default('manual'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('holidays_company_id_idx').on(t.companyId),
    index('holidays_date_idx').on(t.date),
    index('holidays_name_idx').on(t.name),
    index('holidays_year_idx').on(t.year),
    index('holidays_type_idx').on(t.type),
    index('holidays_country_idx').on(t.country),
    index('holidays_source_idx').on(t.source),
  ],
);
