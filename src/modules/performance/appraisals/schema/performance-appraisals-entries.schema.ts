import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { appraisals } from './performance-appraisals.schema';
import { competencyLevels, performanceCompetencies } from 'src/drizzle/schema';

export const appraisalEntries = pgTable('performance_appraisal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),

  appraisalId: uuid('appraisal_id')
    .references(() => appraisals.id)
    .notNull(),

  competencyId: uuid('competency_id')
    .references(() => performanceCompetencies.id)
    .notNull(),

  expectedLevelId: uuid('expected_level_id')
    .references(() => competencyLevels.id)
    .notNull(), // From role expectations

  employeeLevelId: uuid('employee_level_id').references(
    () => competencyLevels.id,
    { onDelete: 'set null' },
  ),

  managerLevelId: uuid('manager_level_id').references(
    () => competencyLevels.id,
    { onDelete: 'set null' },
  ),

  notes: text('notes'), // Optional notes or feedback for this entry

  createdAt: timestamp('created_at').defaultNow(),
});
