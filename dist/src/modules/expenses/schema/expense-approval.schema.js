"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expenseApprovals = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const expense_schema_1 = require("./expense.schema");
exports.expenseApprovals = (0, pg_core_1.pgTable)('expense_approvals', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    expenseId: (0, pg_core_1.uuid)('expense_id')
        .notNull()
        .references(() => expense_schema_1.expenses.id, { onDelete: 'cascade' }),
    stepId: (0, pg_core_1.uuid)('step_id')
        .notNull()
        .references(() => schema_1.approvalSteps.id, { onDelete: 'cascade' }),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    action: (0, pg_core_1.varchar)('action', { length: 50 }).notNull(),
    remarks: (0, pg_core_1.text)('remarks'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('expense_approvals_expense_id_idx').on(t.expenseId),
    (0, pg_core_1.index)('expense_approvals_step_id_idx').on(t.stepId),
    (0, pg_core_1.index)('expense_approvals_actor_id_idx').on(t.actorId),
    (0, pg_core_1.index)('expense_approvals_action_idx').on(t.action),
    (0, pg_core_1.index)('expense_approvals_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=expense-approval.schema.js.map