"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyResults = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_objectives_schema_1 = require("./performance-objectives.schema");
const goal_enums_schema_1 = require("./goal.enums.schema");
exports.keyResults = (0, pg_core_1.pgTable)('performance_key_results', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    objectiveId: (0, pg_core_1.uuid)('objective_id')
        .notNull()
        .references(() => performance_objectives_schema_1.objectives.id, { onDelete: 'cascade' }),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, goal_enums_schema_1.krTypeEnum)('type').notNull().default('metric'),
    scoringMethod: (0, goal_enums_schema_1.scoringMethodEnum)('scoring_method')
        .notNull()
        .default('okr_classic'),
    unit: (0, pg_core_1.text)('unit'),
    direction: (0, goal_enums_schema_1.directionEnum)('direction'),
    baseline: (0, pg_core_1.numeric)('baseline', { precision: 18, scale: 6 }),
    target: (0, pg_core_1.numeric)('target', { precision: 18, scale: 6 }),
    minRange: (0, pg_core_1.numeric)('min_range', { precision: 18, scale: 6 }),
    maxRange: (0, pg_core_1.numeric)('max_range', { precision: 18, scale: 6 }),
    current: (0, pg_core_1.numeric)('current', { precision: 18, scale: 6 }),
    progressPct: (0, pg_core_1.integer)('progress_pct'),
    weight: (0, pg_core_1.integer)('weight'),
    ownerEmployeeId: (0, pg_core_1.uuid)('owner_employee_id').references(() => schema_1.employees.id, {
        onDelete: 'set null',
    }),
    source: (0, goal_enums_schema_1.sourceEnum)('source').notNull().default('manual'),
    sourceRef: (0, pg_core_1.text)('source_ref'),
    startDate: (0, pg_core_1.date)('start_date'),
    dueDate: (0, pg_core_1.date)('due_date'),
    isArchived: (0, pg_core_1.boolean)('is_archived').default(false),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_krs_objective').on(t.objectiveId),
    (0, pg_core_1.index)('idx_krs_owner').on(t.ownerEmployeeId),
]);
//# sourceMappingURL=performance-key-results.schema.js.map