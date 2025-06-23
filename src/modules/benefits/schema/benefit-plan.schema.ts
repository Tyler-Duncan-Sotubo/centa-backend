// drizzle/schema/benefitPlans.ts

import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { benefitGroups } from './benefit-groups.schema';

export const benefitPlans = pgTable(
  'benefit_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),

    benefitGroupId: uuid('benefit_group_id')
      .notNull()
      .references(() => benefitGroups.id),

    name: text('name').notNull(),
    description: text('description'),
    category: text('category').notNull(), // e.g. Health, Dental
    coverageOptions: jsonb('coverage_options').notNull(), // array of strings
    cost: jsonb('cost').notNull(), // record<string, string>
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    createdAt: timestamp('created_at').defaultNow(),
    split: text('split').notNull(), // 'employee' | 'employer' | 'shared'
    employerContribution: integer('employer_contribution').default(0),
  },
  (t) => [
    index('benefit_plans_company_id_idx').on(t.companyId),
    index('benefit_plans_benefit_group_id_idx').on(t.benefitGroupId),
    index('benefit_plans_name_idx').on(t.name),
    index('benefit_plans_category_idx').on(t.category),
    index('benefit_plans_start_date_idx').on(t.startDate),
    index('benefit_plans_end_date_idx').on(t.endDate),
    index('benefit_plans_created_at_idx').on(t.createdAt),
  ],
);
