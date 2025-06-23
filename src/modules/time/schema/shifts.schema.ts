import {
  pgTable,
  uuid,
  varchar,
  time,
  jsonb,
  boolean,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { companies, companyLocations } from 'src/drizzle/schema';

export const shifts = pgTable(
  'shifts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    locationId: uuid('company_location').references(() => companyLocations.id, {
      onDelete: 'set null',
    }),

    name: varchar('name', { length: 100 }).notNull(),

    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),

    workingDays: jsonb('working_days').notNull(), // e.g. ["monday", "tuesday", …]

    lateToleranceMinutes: integer('late_tolerance_minutes').default(10),

    allowEarlyClockIn: boolean('allow_early_clock_in').default(false),
    earlyClockInMinutes: integer('early_clock_in_minutes').default(0),

    allowLateClockOut: boolean('allow_late_clock_out').default(false),
    lateClockOutMinutes: integer('late_clock_out_minutes').default(0),

    notes: varchar('notes', { length: 255 }),

    isDeleted: boolean('is_deleted').default(false),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('shifts_company_id_idx').on(t.companyId),
    index('shifts_location_id_idx').on(t.locationId),
    index('shifts_name_idx').on(t.name),
    index('shifts_is_deleted_idx').on(t.isDeleted),
    index('shifts_created_at_idx').on(t.createdAt),
  ],
);
