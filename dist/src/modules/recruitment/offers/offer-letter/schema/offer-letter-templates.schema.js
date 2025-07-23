"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerLetterTemplates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../../drizzle/schema");
exports.offerLetterTemplates = (0, pg_core_1.pgTable)('offer_letter_templates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id),
    name: (0, pg_core_1.text)('name').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false),
    isSystemTemplate: (0, pg_core_1.boolean)('is_system_template').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    clonedFromTemplateId: (0, pg_core_1.uuid)('cloned_from_template_id'),
});
//# sourceMappingURL=offer-letter-templates.schema.js.map