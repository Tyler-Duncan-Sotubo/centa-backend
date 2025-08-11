"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.competencyLevels = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.competencyLevels = (0, pg_core_1.pgTable)('performance_competency_levels', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    weight: (0, pg_core_1.integer)('weight').notNull(),
});
//# sourceMappingURL=performance-competency-levels.schema.js.map