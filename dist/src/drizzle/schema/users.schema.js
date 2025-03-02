"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.roleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
exports.roleEnum = (0, pg_core_1.pgEnum)('role_enum', [
    'admin',
    'hr_manager',
    'employee',
    'payroll_specialist',
    'super_admin',
]);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    first_name: (0, pg_core_1.text)('first_name'),
    last_name: (0, pg_core_1.text)('last_name'),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    password: (0, pg_core_1.text)('password').notNull(),
    role: (0, exports.roleEnum)('role').notNull().default('employee'),
    plan: (0, pg_core_1.text)('plan').default('free'),
    is_verified: (0, pg_core_1.boolean)('is_verified').default(false),
    last_login: (0, pg_core_1.timestamp)('last_login'),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    avatar: (0, pg_core_1.text)('avatar'),
    company_id: (0, pg_core_1.uuid)('company_id')
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
}, (table) => [(0, pg_core_1.uniqueIndex)('email_idx').on(table.email)]);
//# sourceMappingURL=users.schema.js.map