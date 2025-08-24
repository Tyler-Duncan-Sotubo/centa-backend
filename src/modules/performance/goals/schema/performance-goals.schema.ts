import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
  date,
  // sql,         // uncomment if you want a CHECK constraint (see below)
} from 'drizzle-orm/pg-core';
import {
  companies,
  employees,
  groups,
  performanceCycles,
  users,
} from 'src/drizzle/schema';

export const performanceGoals = pgTable(
  'performance_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => performanceCycles.id, { onDelete: 'cascade' }),

    // Ownership: an individual employee OR an employee group (both optional fields)
    employeeId: uuid('employee_id').references(() => employees.id, {
      onDelete: 'cascade',
    }),
    employeeGroupId: uuid('employee_group_id').references(() => groups.id, {
      onDelete: 'cascade',
    }),

    title: text('title').notNull(),
    description: text('description'),

    type: text('type').default('OKR'),
    status: text('status').default('draft'),
    weight: integer('weight'),

    parentGoalId: uuid('parent_goal_id').references(() => performanceGoals.id, {
      onDelete: 'set null',
    }),

    startDate: date('start_date').notNull(),
    dueDate: date('due_date').notNull(),

    assignedAt: timestamp('assigned_at').defaultNow(),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id),

    isPrivate: boolean('is_private').default(false),
    updatedAt: timestamp('updated_at').defaultNow(),
    isArchived: boolean('is_archived').default(false),
  },
  (t) => [
    index('idx_goals_company_id').on(t.companyId),
    index('idx_goals_cycle_id').on(t.cycleId),
    index('idx_goals_employee_id').on(t.employeeId),
    index('idx_goals_employee_group_id').on(t.employeeGroupId),
  ],
);
