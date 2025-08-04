import { pgTable, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { performanceFeedback } from './performance-feedback.schema';

export const feedbackViewers = pgTable(
  'performance_feedback_viewers',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    feedbackId: uuid('feedback_id')
      .notNull()
      .references(() => performanceFeedback.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    canView: boolean('can_view').default(true),
  },
  (t) => [
    index('idx_feedback_viewers_feedback_id').on(t.feedbackId),
    index('idx_feedback_viewers_user_id').on(t.userId),
  ],
);
