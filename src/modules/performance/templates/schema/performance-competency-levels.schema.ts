import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const competencyLevels = pgTable('performance_competency_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(), // e.g., "Beginner"
  weight: integer('weight').notNull(), // For scoring: 1-5
});
