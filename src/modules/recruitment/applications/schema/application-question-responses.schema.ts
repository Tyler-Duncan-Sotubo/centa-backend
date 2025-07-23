import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { applications } from './applications.schema';

export const application_question_responses = pgTable(
  'application_question_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),

    question: text('question').notNull(), // e.g. "Do you have a work permit?"
    answer: text('answer').notNull(), // e.g. "Yes, for Nigeria"

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
);
