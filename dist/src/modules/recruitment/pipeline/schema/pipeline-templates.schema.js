"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeline_template_stages = exports.pipeline_templates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.pipeline_templates = (0, pg_core_1.pgTable)('pipeline_templates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
});
exports.pipeline_template_stages = (0, pg_core_1.pgTable)('pipeline_template_stages', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    templateId: (0, pg_core_1.uuid)('template_id')
        .references(() => exports.pipeline_templates.id, { onDelete: 'cascade' })
        .notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    order: (0, pg_core_1.integer)('order').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_tplstg_template').on(t.templateId),
    (0, pg_core_1.index)('idx_tplstg_template_order').on(t.templateId, t.order),
]);
//# sourceMappingURL=pipeline-templates.schema.js.map