"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scorecard_criteria = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const scorecard_templates_schema_1 = require("./scorecard-templates.schema");
exports.scorecard_criteria = (0, pg_core_1.pgTable)('scorecard_criteria', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => scorecard_templates_schema_1.scorecard_templates.id, { onDelete: 'cascade' }),
    label: (0, pg_core_1.varchar)('label', { length: 100 }).notNull(),
    description: (0, pg_core_1.varchar)('description', { length: 255 }),
    maxScore: (0, pg_core_1.integer)('max_score').notNull().default(5),
    order: (0, pg_core_1.integer)('order').notNull(),
});
//# sourceMappingURL=scorecard-criteria.schema.js.map