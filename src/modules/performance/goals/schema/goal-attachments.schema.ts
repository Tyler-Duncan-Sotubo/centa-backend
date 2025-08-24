import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { performanceGoals } from './performance-goals.schema';
import { users } from 'src/drizzle/schema';

export const goalAttachments = pgTable(
  'performance_goal_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    goalId: uuid('goal_id')
      .notNull()
      .references(() => performanceGoals.id, { onDelete: 'cascade' }),

    comment: text('comment').notNull(),

    uploadedById: uuid('uploaded_by_id')
      .notNull()
      .references(() => users.id),

    fileUrl: text('file_url').notNull(),
    fileName: text('file_name').notNull(),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [index('idx_goal_attachments_goal_id').on(t.goalId)],
);
