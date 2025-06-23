import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const templateStatusEnum = pgEnum('onboarding_template_status', [
  'draft',
  'published',
]);

export const onboardingTemplates = pgTable(
  'onboarding_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    status: templateStatusEnum('status').default('draft'),
    isGlobal: boolean('is_global').default(false),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),
  },
  (t) => [index('onboarding_templates_name_idx').on(t.name)],
);
