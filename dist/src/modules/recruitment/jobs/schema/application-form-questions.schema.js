"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.application_form_questions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const application_form_configs_schema_1 = require("./application-form-configs.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.application_form_questions = (0, pg_core_1.pgTable)('application_form_questions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    formId: (0, pg_core_1.uuid)('form_id')
        .notNull()
        .references(() => application_form_configs_schema_1.application_form_configs.id, { onDelete: 'cascade' }),
    question: (0, pg_core_1.text)('question').notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    required: (0, pg_core_1.boolean)('required').default(true),
    order: (0, pg_core_1.integer)('order').notNull(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .references(() => schema_1.companies.id)
        .notNull(),
});
//# sourceMappingURL=application-form-questions.schema.js.map