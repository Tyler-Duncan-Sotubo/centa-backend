import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { performanceGoals } from './performance-goals.schema';
import { users } from 'src/drizzle/schema';

export const goalComments = pgTable(
  'performance_goal_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    goalId: uuid('goal_id')
      .notNull()
      .references(() => performanceGoals.id, { onDelete: 'cascade' }),

    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),

    comment: text('comment').notNull(),

    isPrivate: boolean('is_private').default(false), // Only visible to managers

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_goal_comments_goal_id').on(t.goalId),
    index('idx_goal_comments_author_id').on(t.authorId),
  ],
);
