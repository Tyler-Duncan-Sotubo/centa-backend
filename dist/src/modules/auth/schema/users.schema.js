"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    password: (0, pg_core_1.varchar)('password', { length: 255 }).notNull(),
    plan: (0, pg_core_1.varchar)('plan', { length: 50 }).notNull().default('free'),
    isVerified: (0, pg_core_1.boolean)('is_verified').notNull().default(false),
    lastLogin: (0, pg_core_1.timestamp)('last_login', { mode: 'date' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    avatar: (0, pg_core_1.varchar)('avatar', { length: 500 }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    companyRoleId: (0, pg_core_1.uuid)('company_role_id')
        .notNull()
        .references(() => schema_1.companyRoles.id, { onDelete: 'cascade' }),
    verificationCode: (0, pg_core_1.varchar)('verification_code', { length: 6 }),
    verificationCodeExpiresAt: (0, pg_core_1.timestamp)('verification_code_expires_at', {
        mode: 'date',
    }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('email_idx').on(table.email),
    (0, pg_core_1.index)('idx_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_company_role_id').on(table.companyRoleId),
]);
//# sourceMappingURL=users.schema.js.map