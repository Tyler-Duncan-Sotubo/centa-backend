"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyFiles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_schema_1 = require("../../schema/company.schema");
const schema_1 = require("../../../../../drizzle/schema");
const company_file_folders_schema_1 = require("./company-file-folders.schema");
exports.companyFiles = (0, pg_core_1.pgTable)('company_files', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => company_schema_1.companies.id, { onDelete: 'cascade' }),
    folderId: (0, pg_core_1.uuid)('folder_id').references(() => company_file_folders_schema_1.companyFileFolders.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    type: (0, pg_core_1.varchar)('type', { length: 100 }).notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 100 }).notNull(),
    uploadedBy: (0, pg_core_1.uuid)('uploaded_by').references(() => schema_1.users.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
});
//# sourceMappingURL=company-files.schema.js.map