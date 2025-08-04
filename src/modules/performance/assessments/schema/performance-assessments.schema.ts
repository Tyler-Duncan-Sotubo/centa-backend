import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {
  users,
  performanceReviewTemplates,
  performanceCycles,
  companies,
  employees,
} from 'src/drizzle/schema';

export const performanceAssessments = pgTable(
  'performance_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => performanceCycles.id, { onDelete: 'cascade' }),

    templateId: uuid('template_id')
      .notNull()
      .references(() => performanceReviewTemplates.id, { onDelete: 'cascade' }),

    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    revieweeId: uuid('reviewee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    type: text('type').$type<'self' | 'manager' | 'peer'>().notNull(),

    status: text('status')
      .$type<'not_started' | 'in_progress' | 'submitted'>()
      .default('not_started'),

    submittedAt: timestamp('submitted_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('performance_assessments_company_id_idx').on(t.companyId),
    index('performance_assessments_cycle_id_idx').on(t.cycleId),
  ],
);
