import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const scorecard_templates = pgTable(
  'scorecard_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    isSystem: boolean('is_system').default(false),
    companyId: uuid('company_id').references(() => companies.id),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('idx_scorecard_company').on(t.companyId)],
);
