"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyFileFolderRoles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_file_folders_schema_1 = require("./company-file-folders.schema");
const schema_1 = require("../../../../../drizzle/schema");
exports.companyFileFolderRoles = (0, pg_core_1.pgTable)('company_file_folder_roles', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    folderId: (0, pg_core_1.uuid)('folder_id')
        .notNull()
        .references(() => company_file_folders_schema_1.companyFileFolders.id, { onDelete: 'cascade' }),
    roleId: (0, pg_core_1.uuid)('role_id')
        .notNull()
        .references(() => schema_1.companyRoles.id, { onDelete: 'cascade' }),
});
//# sourceMappingURL=company-file-folder-roles.schema.js.map