"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.application_history = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const schema_2 = require("../../schema");
const applications_schema_1 = require("./applications.schema");
exports.application_history = (0, pg_core_1.pgTable)('application_history', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    applicationId: (0, pg_core_1.uuid)('application_id')
        .notNull()
        .references(() => applications_schema_1.applications.id, { onDelete: 'cascade' }),
    fromStatus: (0, schema_2.AppStatus)('from_status'),
    toStatus: (0, schema_2.AppStatus)('to_status'),
    changedAt: (0, pg_core_1.timestamp)('changed_at', { withTimezone: true }).defaultNow(),
    changedBy: (0, pg_core_1.uuid)('changed_by').references(() => schema_1.users.id),
    notes: (0, pg_core_1.text)('notes'),
}, (t) => [(0, pg_core_1.index)('idx_apphist_app').on(t.applicationId)]);
//# sourceMappingURL=application-history.schema.js.map