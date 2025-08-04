import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
  date,
} from 'drizzle-orm/pg-core';
import {
  companies,
  employees,
  performanceCycles,
  users,
} from 'src/drizzle/schema';

export const performanceGoals = pgTable(
  'performance_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, {
        onDelete: 'cascade',
      }),

    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => performanceCycles.id, {
        onDelete: 'cascade',
      }),

    employeeId: uuid('employee_id').references(() => employees.id, {
      onDelete: 'cascade',
    }),

    title: text('title').notNull(),
    description: text('description'),

    type: text('type').default('OKR'), // OKR, KPI, etc.
    status: text('status').default('draft'), // draft, active, completed, etc.
    weight: integer('weight'), // optional impact weight (0–100)

    parentGoalId: uuid('parent_goal_id').references(() => performanceGoals.id, {
      onDelete: 'set null',
    }),

    startDate: date('start_date').notNull(),
    dueDate: date('due_date').notNull(),

    assignedAt: timestamp('assigned_at').defaultNow(),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id), // optional

    isPrivate: boolean('is_private').default(false), // For visibility control
    updatedAt: timestamp('updated_at').defaultNow(),
    isArchived: boolean('is_archived').default(false), // Soft delete
  },
  (t) => [
    index('idx_goals_company_id').on(t.companyId),
    index('idx_goals_cycle_id').on(t.cycleId),
  ],
);
