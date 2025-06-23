import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { approvalSteps, users } from 'src/drizzle/schema';
import { expenses } from './expense.schema';

export const expenseApprovals = pgTable(
  'expense_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),

    stepId: uuid('step_id')
      .notNull()
      .references(() => approvalSteps.id, { onDelete: 'cascade' }),

    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    action: varchar('action', { length: 50 }).notNull(), // e.g., "approved", "pending", "rejected"
    remarks: text('remarks'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('expense_approvals_expense_id_idx').on(t.expenseId),
    index('expense_approvals_step_id_idx').on(t.stepId),
    index('expense_approvals_actor_id_idx').on(t.actorId),
    index('expense_approvals_action_idx').on(t.action),
    index('expense_approvals_created_at_idx').on(t.createdAt),
  ],
);
