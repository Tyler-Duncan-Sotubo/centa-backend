"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyFileFolders = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("./company.schema");
const schema_1 = require("../../../../drizzle/schema");
exports.companyFileFolders = (0, pg_core_1.pgTable)('company_file_folders', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    permissionControlled: (0, pg_core_1.boolean)('permission_controlled').default(false),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => schema_1.users.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=company-file-folders.schema.js.map