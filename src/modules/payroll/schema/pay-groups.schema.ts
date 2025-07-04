import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { paySchedules } from './pay-schedules.schema';

export const payGroups = pgTable(
  'pay_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),

    // Deductions
    applyPaye: boolean('apply_paye').default(false),
    applyPension: boolean('apply_pension').default(false),
    applyNhf: boolean('apply_nhf').default(false),

    // Foreign keys
    payScheduleId: uuid('pay_schedule_id')
      .notNull()
      .references(() => paySchedules.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),

    isDeleted: boolean('is_deleted').default(false),
  },
  (t) => [
    index('pay_groups_name_idx').on(t.name),
    index('pay_groups_pay_schedule_id_idx').on(t.payScheduleId),
    index('pay_groups_company_id_idx').on(t.companyId),
    index('pay_groups_created_at_idx').on(t.createdAt),
    index('pay_groups_is_deleted_idx').on(t.isDeleted),
  ],
);
