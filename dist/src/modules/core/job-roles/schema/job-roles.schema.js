"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRoles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.jobRoles = (0, pg_core_1.pgTable)('job_roles', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    level: (0, pg_core_1.varchar)('level', { length: 100 }),
    description: (0, pg_core_1.text)('description'),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_job_roles_company_title').on(t.companyId, t.title),
    (0, pg_core_1.index)('idx_job_roles_company').on(t.companyId),
]);
//# sourceMappingURL=job-roles.schema.js.map