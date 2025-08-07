"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.termination_checklist_items = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.termination_checklist_items = (0, pg_core_1.pgTable)('termination_checklist_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    order: (0, pg_core_1.integer)('order').default(0),
    isAssetReturnStep: (0, pg_core_1.boolean)('is_asset_return_step').default(false),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('termination_checklist_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('termination_checklist_is_global_idx').on(t.isGlobal),
    (0, pg_core_1.index)('termination_checklist_name_idx').on(t.name),
]);
//# sourceMappingURL=termination-checklist-items.schema.js.map