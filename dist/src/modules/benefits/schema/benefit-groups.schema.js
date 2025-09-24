"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benefitGroups = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.benefitGroups = (0, pg_core_1.pgTable)('benefit_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    teamId: (0, pg_core_1.uuid)('team_id').references(() => schema_1.groups.id),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    rules: (0, pg_core_1.jsonb)('rules').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('benefit_groups_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('benefit_groups_name_idx').on(t.name),
    (0, pg_core_1.index)('benefit_groups_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=benefit-groups.schema.js.map