"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetReports = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const assets_schema_1 = require("./assets.schema");
exports.assetReports = (0, pg_core_1.pgTable)('asset_reports', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    assetId: (0, pg_core_1.uuid)('asset_id')
        .notNull()
        .references(() => assets_schema_1.assets.id, { onDelete: 'cascade' }),
    reportType: (0, pg_core_1.text)('report_type').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    documentUrl: (0, pg_core_1.text)('document_url'),
    status: (0, pg_core_1.text)('status').default('open'),
    reportedAt: (0, pg_core_1.timestamp)('reported_at').defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('asset_reports_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('asset_reports_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('asset_reports_asset_id_idx').on(t.assetId),
    (0, pg_core_1.index)('asset_reports_report_type_idx').on(t.reportType),
    (0, pg_core_1.index)('asset_reports_status_idx').on(t.status),
    (0, pg_core_1.index)('asset_reports_reported_at_idx').on(t.reportedAt),
]);
//# sourceMappingURL=asset-reports.schema.js.map