"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.application_form_fields = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const application_form_configs_schema_1 = require("./application-form-configs.schema");
exports.application_form_fields = (0, pg_core_1.pgTable)('application_form_fields', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    formId: (0, pg_core_1.uuid)('form_id')
        .notNull()
        .references(() => application_form_configs_schema_1.application_form_configs.id, { onDelete: 'cascade' }),
    section: (0, pg_core_1.varchar)('section', { length: 50 }).notNull(),
    isVisible: (0, pg_core_1.boolean)('is_visible').default(true),
    isEditable: (0, pg_core_1.boolean)('is_editable').default(true),
    label: (0, pg_core_1.varchar)('label', { length: 255 }).notNull(),
    fieldType: (0, pg_core_1.varchar)('field_type', { length: 50 }).notNull(),
    required: (0, pg_core_1.boolean)('required').default(true),
    order: (0, pg_core_1.integer)('order').notNull(),
});
//# sourceMappingURL=application-form-fields.schema.js.map