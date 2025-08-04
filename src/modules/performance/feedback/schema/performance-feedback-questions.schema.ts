import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const feedbackQuestions = pgTable('performance_feedback_questions', {
  id: uuid('id').primaryKey().defaultRandom(),

  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  type: text('type').notNull(), // 'self' | 'peer' | 'manager_to_employee' | 'employee_to_manager'

  question: text('question').notNull(),
  inputType: text('input_type').default('text'), // 'text' | 'rating' | 'yes_no'

  order: integer('order').default(0),
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at').defaultNow(),
});
