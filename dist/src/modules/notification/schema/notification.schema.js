"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notification = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const schema_2 = require("../../../drizzle/schema");
exports.notification = (0, pg_core_1.pgTable)('notification', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    message: (0, pg_core_1.text)('message').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    read: (0, pg_core_1.text)('read').notNull().default('false'),
    url: (0, pg_core_1.text)('url').notNull(),
    company_id: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .references(() => schema_2.employees.id, { onDelete: 'cascade' }),
    created_at: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('notifications_company_id_idx').on(t.company_id),
    (0, pg_core_1.index)('notifications_employee_id_idx').on(t.employee_id),
    (0, pg_core_1.index)('notifications_type_idx').on(t.type),
    (0, pg_core_1.index)('notifications_read_idx').on(t.read),
    (0, pg_core_1.index)('notifications_created_at_idx').on(t.created_at),
]);
//# sourceMappingURL=notification.schema.js.map