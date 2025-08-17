import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { keyResults } from './performance-key-results.schema';
import { objectives } from './performance-objectives.schema';

export const objectiveComments = pgTable(
  'performance_goal_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objectiveId: uuid('objective_id').references(() => objectives.id, {
      onDelete: 'cascade',
    }),
    keyResultId: uuid('key_result_id').references(() => keyResults.id, {
      onDelete: 'cascade',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    comment: text('comment').notNull(),
    isPrivate: boolean('is_private').default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_goal_comments_objective_id').on(t.objectiveId),
    index('idx_goal_comments_key_result_id').on(t.keyResultId),
    index('idx_goal_comments_author_id').on(t.authorId),
  ],
);
