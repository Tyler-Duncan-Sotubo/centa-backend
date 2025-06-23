import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from '../../schema';

// --- JOB ROLES TABLE ---
export const jobRoles = pgTable(
  'job_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    level: varchar('level', { length: 100 }),
    description: text('description'),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_job_roles_company_title').on(t.companyId, t.title),
    index('idx_job_roles_company').on(t.companyId),
  ],
);
