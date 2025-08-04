"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appraisalEntries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const performance_appraisals_schema_1 = require("./performance-appraisals.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.appraisalEntries = (0, pg_core_1.pgTable)('performance_appraisal_entries', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    appraisalId: (0, pg_core_1.uuid)('appraisal_id')
        .references(() => performance_appraisals_schema_1.appraisals.id)
        .notNull(),
    competencyId: (0, pg_core_1.uuid)('competency_id')
        .references(() => schema_1.performanceCompetencies.id)
        .notNull(),
    expectedLevelId: (0, pg_core_1.uuid)('expected_level_id')
        .references(() => schema_1.competencyLevels.id)
        .notNull(),
    employeeLevelId: (0, pg_core_1.uuid)('employee_level_id').references(() => schema_1.competencyLevels.id, { onDelete: 'set null' }),
    managerLevelId: (0, pg_core_1.uuid)('manager_level_id').references(() => schema_1.competencyLevels.id, { onDelete: 'set null' }),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=performance-appraisals-entries.schema.js.map