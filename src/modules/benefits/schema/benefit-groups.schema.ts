// drizzle/schema/benefitGroups.ts

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies, groups } from 'src/drizzle/schema';

export const benefitGroups = pgTable(
  'benefit_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),

    teamId: uuid('team_id').references(() => groups.id),

    name: text('name').notNull(),
    description: text('description'),
    rules: jsonb('rules').notNull(), // stored as structured filters
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('benefit_groups_company_id_idx').on(t.companyId),
    index('benefit_groups_name_idx').on(t.name),
    index('benefit_groups_created_at_idx').on(t.createdAt),
  ],
);
