import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { companies, employees, users } from 'src/drizzle/schema';

export const performanceFeedback = pgTable(
  'performance_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),

    type: text('type').notNull(), // 'peer', 'manager', 'employee'

    isAnonymous: boolean('is_anonymous').default(false),

    submittedAt: timestamp('submitted_at').defaultNow(),

    createdAt: timestamp('created_at').defaultNow(),
    isArchived: boolean('is_archived').default(false),
  },
  (t) => [
    index('idx_feedback_recipient_id').on(t.recipientId),
    index('idx_feedback_sender_id').on(t.senderId),
  ],
);
