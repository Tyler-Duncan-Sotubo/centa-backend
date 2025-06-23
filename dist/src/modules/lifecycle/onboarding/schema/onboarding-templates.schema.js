"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingTemplates = exports.templateStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../../drizzle/schema");
exports.templateStatusEnum = (0, pg_core_1.pgEnum)('onboarding_template_status', [
    'draft',
    'published',
]);
exports.onboardingTemplates = (0, pg_core_1.pgTable)('onboarding_templates', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    status: (0, exports.templateStatusEnum)('status').default('draft'),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(false),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => schema_1.companies.id, {
        onDelete: 'cascade',
    }),
}, (t) => [(0, pg_core_1.index)('onboarding_templates_name_idx').on(t.name)]);
//# sourceMappingURL=onboarding-templates.schema.js.map