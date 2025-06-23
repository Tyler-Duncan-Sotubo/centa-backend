"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingTemplateFields = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const onboarding_templates_schema_1 = require("./onboarding-templates.schema");
exports.onboardingTemplateFields = (0, pg_core_1.pgTable)('onboarding_template_fields', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => onboarding_templates_schema_1.onboardingTemplates.id, { onDelete: 'cascade' }),
    fieldKey: (0, pg_core_1.text)('field_key').notNull(),
    label: (0, pg_core_1.text)('label').notNull(),
    fieldType: (0, pg_core_1.text)('field_type').notNull(),
    required: (0, pg_core_1.boolean)('required').default(false),
    order: (0, pg_core_1.integer)('order').default(0),
    tag: (0, pg_core_1.text)('tag').notNull(),
}, (t) => [
    (0, pg_core_1.index)('onboarding_template_fields_template_id_idx').on(t.templateId),
    (0, pg_core_1.index)('onboarding_template_fields_field_key_idx').on(t.fieldKey),
    (0, pg_core_1.index)('onboarding_template_fields_tag_idx').on(t.tag),
]);
//# sourceMappingURL=onboarding-template-fields.schema.js.map