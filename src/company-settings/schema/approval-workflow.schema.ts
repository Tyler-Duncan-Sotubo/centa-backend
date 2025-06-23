import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from 'src/drizzle/schema';

export const approvalWorkflows = pgTable(
  'approval_workflows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // e.g., "Expense Approval", "Leave Request"
    createdAt: timestamp('created_at').defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    entityId: uuid('entity_id').notNull(), // ID of expense, payroll run, leave, etc.
    entityDate: date('entity_date').notNull(), // Date of the entity, e.g., expense date, leave start date
  },
  (t) => [
    index('approval_workflows_name_idx').on(t.name),
    index('approval_workflows_company_id_idx').on(t.companyId),
    index('approval_workflows_entity_id_idx').on(t.entityId),
    index('approval_workflows_entity_date_idx').on(t.entityDate),
    index('approval_workflows_created_at_idx').on(t.createdAt),
  ],
);

export const approvalSteps = pgTable(
  'approval_steps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workflowId: uuid('workflow_id')
      .notNull()
      .references(() => approvalWorkflows.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(), // 1, 2, 3, …
    role: text('role').notNull(), // e.g. “manager”, “finance”
    status: text('status').notNull().default('pending'), // e.g. “pending”, “approved”, “rejected”
    minApprovals: integer('min_approvals').notNull().default(1),
    maxApprovals: integer('max_approvals').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('approval_steps_workflow_id_idx').on(t.workflowId),
    index('approval_steps_sequence_idx').on(t.sequence),
    index('approval_steps_role_idx').on(t.role),
    index('approval_steps_status_idx').on(t.status),
    index('approval_steps_created_at_idx').on(t.createdAt),
  ],
);
