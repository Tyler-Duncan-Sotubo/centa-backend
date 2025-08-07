"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employee_termination_checklist = exports.termination_sessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const termination_reasons_schema_1 = require("./termination-reasons.schema");
const termination_types_schema_1 = require("./termination-types.schema");
const assets_schema_1 = require("../../../assets/schema/assets.schema");
exports.termination_sessions = (0, pg_core_1.pgTable)('termination_sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    terminationType: (0, pg_core_1.uuid)('termination_type_id').references(() => termination_types_schema_1.termination_types.id),
    terminationReason: (0, pg_core_1.uuid)('termination_reason_id').references(() => termination_reasons_schema_1.termination_reasons.id),
    notes: (0, pg_core_1.text)('notes'),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).default('in_progress'),
    startedAt: (0, pg_core_1.timestamp)('started_at').defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
}, (t) => [
    (0, pg_core_1.index)('termination_sessions_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('termination_sessions_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('termination_sessions_status_idx').on(t.status),
]);
exports.employee_termination_checklist = (0, pg_core_1.pgTable)('employee_termination_checklist', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id')
        .notNull()
        .references(() => exports.termination_sessions.id, {
        onDelete: 'cascade',
    }),
    assetId: (0, pg_core_1.uuid)('asset_id').references(() => assets_schema_1.assets.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    isAssetReturnStep: (0, pg_core_1.boolean)('is_asset_return_step').default(false),
    order: (0, pg_core_1.integer)('order').default(0),
    completed: (0, pg_core_1.boolean)('completed').default(false),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('employee_termination_checklist_session_id_idx').on(t.sessionId),
]);
//# sourceMappingURL=termination-sessions.schema.js.map