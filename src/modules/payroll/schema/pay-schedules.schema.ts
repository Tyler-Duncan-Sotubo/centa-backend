import {
  boolean,
  date,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const paySchedules = pgTable(
  'pay_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    payFrequency: text('pay_frequency').notNull().default('monthly'), // 'monthly', 'weekly', etc.
    paySchedule: jsonb('pay_schedule'), // Flexible JSON per frequency type
    weekendAdjustment: text('weekend_adjustment').notNull().default('none'), // 'friday', 'monday', 'none'
    holidayAdjustment: text('holiday_adjustment').notNull().default('none'), // 'previous', 'next', 'none'
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    isDeleted: boolean('is_deleted').default(false),
  },
  (t) => [
    index('pay_schedules_company_id_idx').on(t.companyId),
    index('pay_schedules_start_date_idx').on(t.startDate),
    index('pay_schedules_pay_frequency_idx').on(t.payFrequency),
    index('pay_schedules_is_deleted_idx').on(t.isDeleted),
    index('pay_schedules_created_at_idx').on(t.createdAt),
  ],
);
