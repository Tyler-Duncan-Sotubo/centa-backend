"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceGoals = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.performanceGoals = (0, pg_core_1.pgTable)('performance_goals', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    cycleId: (0, pg_core_1.uuid)('cycle_id')
        .notNull()
        .references(() => schema_1.performanceCycles.id, { onDelete: 'cascade' }),
    employeeId: (0, pg_core_1.uuid)('employee_id').references(() => schema_1.employees.id, {
        onDelete: 'cascade',
    }),
    employeeGroupId: (0, pg_core_1.uuid)('employee_group_id').references(() => schema_1.groups.id, {
        onDelete: 'cascade',
    }),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, pg_core_1.text)('type').default('OKR'),
    status: (0, pg_core_1.text)('status').default('draft'),
    weight: (0, pg_core_1.integer)('weight'),
    parentGoalId: (0, pg_core_1.uuid)('parent_goal_id').references(() => exports.performanceGoals.id, {
        onDelete: 'set null',
    }),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    dueDate: (0, pg_core_1.date)('due_date').notNull(),
    assignedAt: (0, pg_core_1.timestamp)('assigned_at').defaultNow(),
    assignedBy: (0, pg_core_1.uuid)('assigned_by')
        .notNull()
        .references(() => schema_1.users.id),
    isPrivate: (0, pg_core_1.boolean)('is_private').default(false),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false),
}, (t) => [
    (0, pg_core_1.index)('idx_goals_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_goals_cycle_id').on(t.cycleId),
    (0, pg_core_1.index)('idx_goals_employee_id').on(t.employeeId),
    (0, pg_core_1.index)('idx_goals_employee_group_id').on(t.employeeGroupId),
]);
//# sourceMappingURL=performance-goals.schema.js.map