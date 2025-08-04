"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceCompetencies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.performanceCompetencies = (0, pg_core_1.pgTable)('performance_competencies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_performance_competencies_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_performance_competencies_name').on(t.name),
]);
//# sourceMappingURL=performance-competencies.schema.js.map