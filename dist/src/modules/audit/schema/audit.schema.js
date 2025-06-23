"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => schema_1.users.id, { onDelete: 'cascade' }),
    entity: (0, pg_core_1.text)('entity').notNull(),
    entityId: (0, pg_core_1.uuid)('entity_id'),
    action: (0, pg_core_1.text)('action').notNull(),
    details: (0, pg_core_1.text)('details'),
    changes: (0, pg_core_1.jsonb)('changes'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    correlationId: (0, pg_core_1.uuid)('correlation_id'),
}, (t) => [
    (0, pg_core_1.index)('audit_logs_user_id_idx').on(t.userId),
    (0, pg_core_1.index)('audit_logs_entity_idx').on(t.entity, t.entityId),
    (0, pg_core_1.index)('audit_logs_timestamp_idx').on(t.timestamp),
]);
//# sourceMappingURL=audit.schema.js.map