"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wallets = exports.customers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.customers = (0, pg_core_1.pgTable)('customers', {
    id: (0, pg_core_1.integer)('id').primaryKey().notNull(),
    customer_code: (0, pg_core_1.varchar)('customer_code', { length: 255 }).notNull().unique(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
exports.wallets = (0, pg_core_1.pgTable)('wallets', {
    id: (0, pg_core_1.integer)('id').primaryKey().notNull(),
    customer_id: (0, pg_core_1.integer)('customer_id')
        .notNull()
        .references(() => exports.customers.id),
    customer_code: (0, pg_core_1.varchar)('customer_code', { length: 255 }).notNull(),
    bank_id: (0, pg_core_1.integer)('bank_id').notNull(),
    bank_name: (0, pg_core_1.varchar)('bank_name', { length: 100 }).notNull(),
    bank_slug: (0, pg_core_1.varchar)('bank_slug', { length: 100 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull(),
    account_name: (0, pg_core_1.varchar)('account_name', { length: 255 }).notNull(),
    account_number: (0, pg_core_1.varchar)('account_number', { length: 20 }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull(),
});
//# sourceMappingURL=wallet.schema.js.map