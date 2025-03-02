"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notification = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
exports.notification = (0, pg_core_1.pgTable)('notification', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    message: (0, pg_core_1.text)('message').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    read: (0, pg_core_1.text)('read').notNull().default('false'),
    url: (0, pg_core_1.text)('url').notNull(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .references(() => company_schema_1.companies.id)
        .notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (table) => [(0, pg_core_1.index)('idx_user_id').on(table.company_id)]);
//# sourceMappingURL=notifcation.schema.js.map