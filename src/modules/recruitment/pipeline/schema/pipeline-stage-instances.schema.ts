import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { applications, pipeline_stages } from '../../schema';

export const pipeline_stage_instances = pgTable(
  'pipeline_stage_instances',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),

    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipeline_stages.id, { onDelete: 'cascade' }),

    enteredAt: timestamp('entered_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('idx_stage_instance_app').on(t.applicationId),
    index('idx_stage_instance_stage').on(t.stageId),
  ],
);
