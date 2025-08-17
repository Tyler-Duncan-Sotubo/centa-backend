"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectives = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const goal_enums_schema_1 = require("./goal.enums.schema");
exports.objectives = (0, pg_core_1.pgTable)('performance_objectives', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    cycleId: (0, pg_core_1.uuid)('cycle_id')
        .notNull()
        .references(() => schema_1.performanceCycles.id, { onDelete: 'cascade' }),
    ownerEmployeeId: (0, pg_core_1.uuid)('owner_employee_id').references(() => schema_1.employees.id, {
        onDelete: 'set null',
    }),
    ownerGroupId: (0, pg_core_1.uuid)('owner_group_id').references(() => schema_1.groups.id, {
        onDelete: 'set null',
    }),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    status: (0, goal_enums_schema_1.objectiveStatusEnum)('status').notNull().default('draft'),
    visibility: (0, goal_enums_schema_1.visibilityEnum)('visibility').notNull().default('company'),
    weight: (0, pg_core_1.integer)('weight'),
    score: (0, pg_core_1.integer)('score'),
    confidence: (0, pg_core_1.integer)('confidence'),
    parentObjectiveId: (0, pg_core_1.uuid)('parent_objective_id').references(() => exports.objectives.id, { onDelete: 'set null' }),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    dueDate: (0, pg_core_1.date)('due_date').notNull(),
    assignedAt: (0, pg_core_1.timestamp)('assigned_at').defaultNow(),
    assignedBy: (0, pg_core_1.uuid)('assigned_by')
        .notNull()
        .references(() => schema_1.users.id),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_objectives_company_cycle').on(t.companyId, t.cycleId),
    (0, pg_core_1.index)('idx_objectives_owner_emp').on(t.ownerEmployeeId),
    (0, pg_core_1.index)('idx_objectives_owner_group').on(t.ownerGroupId),
]);
//# sourceMappingURL=performance-objectives.schema.js.map