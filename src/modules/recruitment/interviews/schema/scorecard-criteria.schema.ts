import { pgTable, uuid, varchar, integer } from 'drizzle-orm/pg-core';
import { scorecard_templates } from './scorecard-templates.schema';

export const scorecard_criteria = pgTable('scorecard_criteria', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id')
    .notNull()
    .references(() => scorecard_templates.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 100 }).notNull(), // e.g. "Communication"
  description: varchar('description', { length: 255 }),
  maxScore: integer('max_score').notNull().default(5), // Max value the interviewer can assign
  order: integer('order').notNull(), // To determine display order
});
