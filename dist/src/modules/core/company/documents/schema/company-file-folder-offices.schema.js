"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyFileFolderOffices = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_file_folders_schema_1 = require("./company-file-folders.schema");
const schema_1 = require("../../../../../drizzle/schema");
exports.companyFileFolderOffices = (0, pg_core_1.pgTable)('company_file_folder_offices', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    folderId: (0, pg_core_1.uuid)('folder_id')
        .notNull()
        .references(() => company_file_folders_schema_1.companyFileFolders.id, { onDelete: 'cascade' }),
    officeId: (0, pg_core_1.uuid)('office_id')
        .notNull()
        .references(() => schema_1.companyLocations.id, { onDelete: 'cascade' }),
});
//# sourceMappingURL=company-file-folder-offices.schema.js.map