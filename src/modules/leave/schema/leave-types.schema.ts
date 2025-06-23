import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const leaveTypes = pgTable(
  'leave_types',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: varchar('name', { length: 100 }).notNull(), // e.g., "Vacation Leave"
    isPaid: boolean('is_paid').default(true), // Paid vs Unpaid leave
    colorTag: varchar('color_tag', { length: 10 }), // UI color (e.g., "#FF5733")

    // Tenant scope
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('leave_types_name_idx').on(t.name),
    index('leave_types_is_paid_idx').on(t.isPaid),
    index('leave_types_company_id_idx').on(t.companyId),
    index('leave_types_created_at_idx').on(t.createdAt),
  ],
);
