"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.attachments = (0, pg_core_1.pgTable)('attachments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    parentType: (0, pg_core_1.varchar)('parent_type', { length: 50 }).notNull(),
    parentId: (0, pg_core_1.uuid)('parent_id').notNull(),
    url: (0, pg_core_1.varchar)('url', { length: 500 }).notNull(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 100 }),
    uploadedBy: (0, pg_core_1.uuid)('uploaded_by').references(() => schema_1.employees.id),
    uploadedAt: (0, pg_core_1.timestamp)('uploaded_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_att_parent').on(t.parentType, t.parentId),
    (0, pg_core_1.index)('idx_att_upload').on(t.uploadedBy),
]);
//# sourceMappingURL=attachments.schema.js.map