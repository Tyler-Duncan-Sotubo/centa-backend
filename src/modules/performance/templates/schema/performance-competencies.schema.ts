import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const performanceCompetencies = pgTable(
  'performance_competencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    name: text('name').notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    isGlobal: boolean('is_global').default(false),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('idx_performance_competencies_company_id').on(t.companyId),
    index('idx_performance_competencies_name').on(t.name),
  ],
);
