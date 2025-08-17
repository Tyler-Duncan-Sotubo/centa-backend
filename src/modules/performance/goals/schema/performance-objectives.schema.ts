import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  date,
  index,
} from 'drizzle-orm/pg-core';
import {
  companies,
  employees,
  groups as employeeGroups,
  performanceCycles,
  users,
} from 'src/drizzle/schema';
import { objectiveStatusEnum, visibilityEnum } from './goal.enums.schema';

export const objectives = pgTable(
  'performance_objectives',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    cycleId: uuid('cycle_id')
      .notNull()
      .references(() => performanceCycles.id, { onDelete: 'cascade' }),

    // Ownership (either employee or group, or both)
    ownerEmployeeId: uuid('owner_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    ownerGroupId: uuid('owner_group_id').references(() => employeeGroups.id, {
      onDelete: 'set null',
    }),

    title: text('title').notNull(),
    description: text('description'),

    status: objectiveStatusEnum('status').notNull().default('draft'),
    visibility: visibilityEnum('visibility').notNull().default('company'),

    // weights & scoring
    weight: integer('weight'), // 0..100 (enforced in service or CHECK)
    score: integer('score'), // store 0..100 (derived), optional cache
    confidence: integer('confidence'), // 0..100 (optional OKR practice)

    // alignment
    parentObjectiveId: uuid('parent_objective_id').references(
      () => objectives.id,
      { onDelete: 'set null' },
    ),

    startDate: date('start_date').notNull(),
    dueDate: date('due_date').notNull(),

    assignedAt: timestamp('assigned_at').defaultNow(),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id),

    isArchived: boolean('is_archived').default(false),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('idx_objectives_company_cycle').on(t.companyId, t.cycleId),
    index('idx_objectives_owner_emp').on(t.ownerEmployeeId),
    index('idx_objectives_owner_group').on(t.ownerGroupId),
  ],
);
