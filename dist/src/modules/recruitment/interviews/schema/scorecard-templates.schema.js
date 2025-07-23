"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scorecard_templates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.scorecard_templates = (0, pg_core_1.pgTable)('scorecard_templates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    isSystem: (0, pg_core_1.boolean)('is_system').default(false),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    description: (0, pg_core_1.varchar)('description', { length: 255 }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_scorecard_company').on(t.companyId)]);
//# sourceMappingURL=scorecard-templates.schema.js.map