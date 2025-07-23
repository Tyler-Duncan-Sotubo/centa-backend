"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerLetterTemplateVariableLinks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const offer_letter_template_variables_schema_1 = require("./offer-letter-template-variables.schema");
const offer_letter_templates_schema_1 = require("./offer-letter-templates.schema");
exports.offerLetterTemplateVariableLinks = (0, pg_core_1.pgTable)('offer_letter_template_variable_links', {
    templateId: (0, pg_core_1.uuid)('template_id')
        .notNull()
        .references(() => offer_letter_templates_schema_1.offerLetterTemplates.id, { onDelete: 'cascade' }),
    variableId: (0, pg_core_1.uuid)('variable_id')
        .notNull()
        .references(() => offer_letter_template_variables_schema_1.offerLetterTemplateVariables.id, {
        onDelete: 'cascade',
    }),
}, (t) => [(0, pg_core_1.index)('template_variable_link_idx').on(t.templateId, t.variableId)]);
//# sourceMappingURL=offer-letter-template-variable-links.schema.js.map