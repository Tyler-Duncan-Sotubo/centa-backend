"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.termination_reasons = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.termination_reasons = (0, pg_core_1.pgTable)('termination_reasons', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
}, (t) => [
    (0, pg_core_1.index)('termination_reasons_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('termination_reasons_is_global_idx').on(t.isGlobal),
    (0, pg_core_1.index)('termination_reasons_name_idx').on(t.name),
]);
//# sourceMappingURL=termination-reasons.schema.js.map