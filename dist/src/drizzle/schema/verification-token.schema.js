"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationToken = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("./users.schema");
exports.verificationToken = (0, pg_core_1.pgTable)('verificationToken', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    user_id: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.text)('token').notNull(),
    is_used: (0, pg_core_1.boolean)('is_used').notNull(),
    expires_at: (0, pg_core_1.timestamp)('expires_at').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (table) => [(0, pg_core_1.index)('idx_user_id_verification').on(table.user_id)]);
//# sourceMappingURL=verification-token.schema.js.map