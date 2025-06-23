import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from '../../schema';

export const costCenters = pgTable(
  'cost_centers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    budget: integer('budget').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_cost_centers_company_code').on(t.companyId, t.code),
    index('idx_cost_centers_company').on(t.companyId),
  ],
);
