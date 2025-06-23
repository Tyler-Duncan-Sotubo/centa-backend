"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companies = exports.planEnum = exports.currencyEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.currencyEnum = (0, pg_core_1.pgEnum)('currency_enum', [
    'NGN',
    'USD',
    'EUR',
    'GBP',
]);
exports.planEnum = (0, pg_core_1.pgEnum)('plan_enum', ['free', 'pro', 'enterprise']);
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    domain: (0, pg_core_1.varchar)('domain', { length: 255 }).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    country: (0, pg_core_1.varchar)('country', { length: 100 }).notNull(),
    currency: (0, exports.currencyEnum)('currency').notNull().default('NGN'),
    regNo: (0, pg_core_1.varchar)('reg_no', { length: 100 }).notNull().default(''),
    logo_url: (0, pg_core_1.varchar)('logo_url', { length: 255 }).notNull().default(''),
    primaryContactName: (0, pg_core_1.varchar)('primary_contact_name', { length: 255 }),
    primaryContactEmail: (0, pg_core_1.varchar)('primary_contact_email', { length: 255 }),
    primaryContactPhone: (0, pg_core_1.varchar)('primary_contact_phone', { length: 20 }),
    subscriptionPlan: (0, exports.planEnum)('subscription_plan').notNull().default('free'),
    trialEndsAt: (0, pg_core_1.timestamp)('trial_ends_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_companies_domain').on(t.domain),
    (0, pg_core_1.index)('idx_companies_country').on(t.country),
]);
//# sourceMappingURL=company.schema.js.map