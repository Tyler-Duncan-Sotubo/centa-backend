import {
  pgTable,
  uuid,
  boolean,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';
import { performanceAppraisalCycles } from './performance-appraisal-cycle.schema';

export const appraisals = pgTable('performance_appraisals', {
  id: uuid('id').primaryKey().defaultRandom(),

  companyId: uuid('company_id').references(() => companies.id, {
    onDelete: 'cascade',
  }),

  cycleId: uuid('cycle_id')
    .references(() => performanceAppraisalCycles.id)
    .notNull(),

  employeeId: uuid('employee_id').notNull(),
  managerId: uuid('manager_id').notNull(),

  // Status flags
  submittedByEmployee: boolean('submitted_by_employee').default(false),
  submittedByManager: boolean('submitted_by_manager').default(false),
  finalized: boolean('finalized').default(false),

  // Optional final decision fields
  finalScore: integer('final_score'), // Average score after grading
  promotionRecommendation: text('promotion_recommendation', {
    enum: ['promote', 'hold', 'exit'],
  }),
  finalNote: text('final_note'),

  createdAt: timestamp('created_at').defaultNow(),
});
