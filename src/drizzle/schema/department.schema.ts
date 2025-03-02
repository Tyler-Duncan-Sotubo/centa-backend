import {
  pgTable,
  uuid,
  timestamp,
  index,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    head_of_department: uuid('head_of_department'),
    company_id: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }), // ON DELETE CASCADE
    created_at: timestamp('created_at').notNull().defaultNow(),
    is_demo: boolean('is_demo').default(false),
  },
  (table) => [index('idx_company_id_departments').on(table.company_id)],
);

export type DepartmentsType = typeof departments.$inferSelect;
