"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approvalSteps = exports.approvalWorkflows = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../drizzle/schema");
exports.approvalWorkflows = (0, pg_core_1.pgTable)('approval_workflows', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    entityId: (0, pg_core_1.uuid)('entity_id').notNull(),
    entityDate: (0, pg_core_1.date)('entity_date').notNull(),
}, (t) => [
    (0, pg_core_1.index)('approval_workflows_name_idx').on(t.name),
    (0, pg_core_1.index)('approval_workflows_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('approval_workflows_entity_id_idx').on(t.entityId),
    (0, pg_core_1.index)('approval_workflows_entity_date_idx').on(t.entityDate),
    (0, pg_core_1.index)('approval_workflows_created_at_idx').on(t.createdAt),
]);
exports.approvalSteps = (0, pg_core_1.pgTable)('approval_steps', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    workflowId: (0, pg_core_1.uuid)('workflow_id')
        .notNull()
        .references(() => exports.approvalWorkflows.id, { onDelete: 'cascade' }),
    sequence: (0, pg_core_1.integer)('sequence').notNull(),
    role: (0, pg_core_1.text)('role').notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    minApprovals: (0, pg_core_1.integer)('min_approvals').notNull().default(1),
    maxApprovals: (0, pg_core_1.integer)('max_approvals').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('approval_steps_workflow_id_idx').on(t.workflowId),
    (0, pg_core_1.index)('approval_steps_sequence_idx').on(t.sequence),
    (0, pg_core_1.index)('approval_steps_role_idx').on(t.role),
    (0, pg_core_1.index)('approval_steps_status_idx').on(t.status),
    (0, pg_core_1.index)('approval_steps_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=approval-workflow.schema.js.map