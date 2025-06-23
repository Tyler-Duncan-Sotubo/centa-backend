"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeLifecycleTokens = exports.lifecycleTokenType = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.lifecycleTokenType = (0, pg_core_1.pgEnum)('lifecycle_token_type', [
    'onboarding',
    'offboarding',
]);
exports.employeeLifecycleTokens = (0, pg_core_1.pgTable)('employee_lifecycle_tokens', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.text)('token').notNull().unique(),
    type: (0, exports.lifecycleTokenType)('type').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    used: (0, pg_core_1.boolean)('used').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('lifecycle_tokens_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('lifecycle_tokens_type_idx').on(t.type),
]);
//# sourceMappingURL=employee-lifecycle-tokens.schema.js.map