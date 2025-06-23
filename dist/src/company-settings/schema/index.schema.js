"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../drizzle/schema");
exports.companySettings = (0, pg_core_1.pgTable)('company_settings', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id, { onDelete: 'cascade' })
        .notNull(),
    key: (0, pg_core_1.text)('key').notNull(),
    value: (0, pg_core_1.jsonb)('value').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_company_settings').on(t.companyId),
    (0, pg_core_1.index)('idx_company_settings_key').on(t.key),
    (0, pg_core_1.unique)().on(t.companyId, t.key),
]);
//# sourceMappingURL=index.schema.js.map