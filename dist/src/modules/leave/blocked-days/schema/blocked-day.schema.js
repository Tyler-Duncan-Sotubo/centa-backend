"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockedLeaveDays = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.blockedLeaveDays = (0, pg_core_1.pgTable)('blocked_leave_days', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    date: (0, pg_core_1.text)('date').notNull(),
    reason: (0, pg_core_1.text)('reason'),
    createdBy: (0, pg_core_1.uuid)('created_by')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=blocked-day.schema.js.map