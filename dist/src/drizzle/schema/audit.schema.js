"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.auditLog = (0, pg_core_1.pgTable)('audit_log', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    action: (0, pg_core_1.text)('action').notNull(),
    entity: (0, pg_core_1.text)('entity').notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=audit.schema.js.map