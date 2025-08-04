import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { performanceGoals } from './performance-goals.schema';

export const performanceGoalUpdates = pgTable('performance_goal_updates', {
  id: uuid('id').primaryKey().defaultRandom(),

  goalId: uuid('goal_id')
    .notNull()
    .references(() => performanceGoals.id, {
      onDelete: 'cascade',
    }),

  progress: integer('progress').notNull().default(0),
  note: text('note'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
