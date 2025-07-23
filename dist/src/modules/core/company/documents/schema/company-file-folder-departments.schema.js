"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyFileFolderDepartments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_file_folders_schema_1 = require("./company-file-folders.schema");
const schema_1 = require("../../../../../drizzle/schema");
exports.companyFileFolderDepartments = (0, pg_core_1.pgTable)('company_file_folder_departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    folderId: (0, pg_core_1.uuid)('folder_id')
        .notNull()
        .references(() => company_file_folders_schema_1.companyFileFolders.id, { onDelete: 'cascade' }),
    departmentId: (0, pg_core_1.uuid)('department_id')
        .notNull()
        .references(() => schema_1.departments.id, { onDelete: 'cascade' }),
});
//# sourceMappingURL=company-file-folder-departments.schema.js.map