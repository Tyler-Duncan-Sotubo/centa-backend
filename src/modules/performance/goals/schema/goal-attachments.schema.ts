import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { keyResults } from './performance-key-results.schema';
import { objectives } from './performance-objectives.schema';

export const objectiveAttachments = pgTable(
  'performance_goal_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    objectiveId: uuid('objective_id').references(() => objectives.id, {
      onDelete: 'cascade',
    }),
    keyResultId: uuid('key_result_id').references(() => keyResults.id, {
      onDelete: 'cascade',
    }),
    comment: text('comment'),
    uploadedById: uuid('uploaded_by_id')
      .notNull()
      .references(() => users.id),
    fileUrl: text('file_url').notNull(),
    fileName: text('file_name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_goal_attachments_objective_id').on(t.objectiveId),
    index('idx_goal_attachments_key_result_id').on(t.keyResultId),
  ],
);
