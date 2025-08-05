"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAccounts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.googleAccounts = (0, pg_core_1.pgTable)('google_accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    googleEmail: (0, pg_core_1.varchar)('google_email', { length: 255 }).notNull().unique(),
    accessToken: (0, pg_core_1.text)('access_token').notNull(),
    refreshToken: (0, pg_core_1.text)('refresh_token').notNull(),
    tokenType: (0, pg_core_1.varchar)('token_type', { length: 32 }).notNull(),
    scope: (0, pg_core_1.text)('scope').notNull(),
    expiryDate: (0, pg_core_1.timestamp)('expiry_date', { withTimezone: false }).notNull(),
    refreshTokenExpiry: (0, pg_core_1.integer)('refresh_token_expiry').default(604800),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=google.schema.js.map