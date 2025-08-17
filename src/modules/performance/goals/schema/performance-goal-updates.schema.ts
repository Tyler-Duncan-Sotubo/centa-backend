import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { objectives } from './performance-objectives.schema';
import { keyResults } from './performance-key-results.schema';

export const performanceGoalUpdates = pgTable(
  'performance_progress_updates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objectiveId: uuid('objective_id').references(() => objectives.id, {
      onDelete: 'cascade',
    }),
    keyResultId: uuid('key_result_id').references(() => keyResults.id, {
      onDelete: 'cascade',
    }),

    // if KR is metric, `value` is the new measured value; else use 0-100 progress
    value: text('value'), // store numeric-as-text or use numeric if you prefer strict
    progressPct: integer('progress_pct'), // 0..100 (for milestones/subjective)

    note: text('note'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  () => [],
);
