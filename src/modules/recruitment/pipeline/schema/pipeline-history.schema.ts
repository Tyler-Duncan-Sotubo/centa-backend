import { pgTable, uuid, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from 'src/drizzle/schema';
import { applications } from '../../applications/schema/applications.schema';
import { pipeline_stages } from '../../schema';

export const pipeline_history = pgTable(
  'pipeline_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    applicationId: uuid('application_id')
      .references(() => applications.id, { onDelete: 'cascade' })
      .notNull(),
    stageId: uuid('stage_id')
      .references(() => pipeline_stages.id, { onDelete: 'cascade' })
      .notNull(),
    movedAt: timestamp('moved_at', { withTimezone: true }).defaultNow(),
    movedBy: uuid('moved_by').references(() => users.id),
    feedback: text('feedback'),
  },
  (t) => [
    index('idx_pipehist_app').on(t.applicationId),
    index('idx_pipehist_stage').on(t.stageId),
  ],
);
