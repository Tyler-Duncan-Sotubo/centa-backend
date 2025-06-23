"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costCenters = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.costCenters = (0, pg_core_1.pgTable)('cost_centers', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)('code', { length: 20 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    budget: (0, pg_core_1.integer)('budget').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_cost_centers_company_code').on(t.companyId, t.code),
    (0, pg_core_1.index)('idx_cost_centers_company').on(t.companyId),
]);
//# sourceMappingURL=cost-centers.schema.js.map