"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveTypes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.leaveTypes = (0, pg_core_1.pgTable)('leave_types', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    isPaid: (0, pg_core_1.boolean)('is_paid').default(true),
    colorTag: (0, pg_core_1.varchar)('color_tag', { length: 10 }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('leave_types_name_idx').on(t.name),
    (0, pg_core_1.index)('leave_types_is_paid_idx').on(t.isPaid),
    (0, pg_core_1.index)('leave_types_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('leave_types_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=leave-types.schema.js.map