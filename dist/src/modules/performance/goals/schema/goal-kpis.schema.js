"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kpiSnapshots = exports.kpis = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const goal_enums_schema_1 = require("./goal.enums.schema");
exports.kpis = (0, pg_core_1.pgTable)('kpis', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    unit: (0, pg_core_1.text)('unit').notNull(),
    direction: (0, goal_enums_schema_1.directionEnum)('direction').notNull(),
    source: (0, goal_enums_schema_1.sourceEnum)('source').notNull().default('manual'),
    sourceRef: (0, pg_core_1.text)('source_ref'),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [(0, pg_core_1.index)('idx_kpis_company').on(t.companyId)]);
exports.kpiSnapshots = (0, pg_core_1.pgTable)('kpi_snapshots', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    kpiId: (0, pg_core_1.uuid)('kpi_id')
        .notNull()
        .references(() => exports.kpis.id, { onDelete: 'cascade' }),
    value: (0, pg_core_1.numeric)('value', { precision: 18, scale: 6 }).notNull(),
    collectedAt: (0, pg_core_1.timestamp)('collected_at').notNull().defaultNow(),
    collectedBy: (0, pg_core_1.uuid)('collected_by').references(() => schema_1.users.id),
    note: (0, pg_core_1.text)('note'),
}, (t) => [(0, pg_core_1.index)('idx_kpi_snapshots_kpi_time').on(t.kpiId, t.collectedAt)]);
//# sourceMappingURL=goal-kpis.schema.js.map