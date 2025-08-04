import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const performanceReviewTemplates = pgTable(
  'performance_review_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),
    isDefault: boolean('is_default').default(false),

    // Section flags (used during review generation)
    includeGoals: boolean('include_goals').default(false),
    includeAttendance: boolean('include_attendance').default(false), // ✅ new
    includeFeedback: boolean('include_feedback').default(false),
    includeQuestionnaire: boolean('include_questionnaire').default(false),

    requireSignature: boolean('require_signature').default(false),
    restrictVisibility: boolean('restrict_visibility').default(false),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('idx_performance_review_templates_company_id').on(t.companyId),
    index('idx_performance_review_templates_default').on(t.isDefault),
  ],
);
