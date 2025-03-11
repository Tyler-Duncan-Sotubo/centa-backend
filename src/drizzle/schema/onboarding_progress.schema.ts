import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from './company.schema';

export const onboardingProgress = pgTable('onboarding_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  taskKey: varchar('task_key', { length: 255 }).notNull(),
  completed: boolean('completed').default(false).notNull(),
  url: varchar('url', { length: 255 }).notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
});
