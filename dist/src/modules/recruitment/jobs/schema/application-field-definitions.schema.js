"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.application_field_definitions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.application_field_definitions = (0, pg_core_1.pgTable)('application_field_definitions', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    section: (0, pg_core_1.varchar)('section', { length: 50 }).notNull(),
    label: (0, pg_core_1.varchar)('label', { length: 255 }).notNull(),
    fieldType: (0, pg_core_1.varchar)('field_type', { length: 50 }).notNull(),
    isGlobal: (0, pg_core_1.boolean)('is_global').default(true),
});
//# sourceMappingURL=application-field-definitions.schema.js.map