"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleCompetencyExpectations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
const performance_competency_levels_schema_1 = require("./performance-competency-levels.schema");
exports.roleCompetencyExpectations = (0, pg_core_1.pgTable)('performance_role_competency_expectations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    roleId: (0, pg_core_1.uuid)('role_id')
        .references(() => schema_1.jobRoles.id)
        .notNull(),
    competencyId: (0, pg_core_1.uuid)('competency_id')
        .references(() => schema_1.performanceCompetencies.id)
        .notNull(),
    expectedLevelId: (0, pg_core_1.uuid)('expected_level_id')
        .references(() => performance_competency_levels_schema_1.competencyLevels.id)
        .notNull(),
});
//# sourceMappingURL=performance-competency-role-expectations.schema.js.map