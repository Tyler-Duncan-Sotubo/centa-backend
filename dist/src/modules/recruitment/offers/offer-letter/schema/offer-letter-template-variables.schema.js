"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerLetterTemplateVariables = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../../drizzle/schema");
exports.offerLetterTemplateVariables = (0, pg_core_1.pgTable)('offer_letter_template_variables', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    isSystem: (0, pg_core_1.boolean)('is_system').default(true),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('template_variable_name_idx').on(t.name),
    (0, pg_core_1.index)('template_variable_company_idx').on(t.companyId),
]);
//# sourceMappingURL=offer-letter-template-variables.schema.js.map