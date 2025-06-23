"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
exports.assetRequests = (0, pg_core_1.pgTable)('asset_requests', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    requestDate: (0, pg_core_1.date)('request_date').notNull(),
    assetType: (0, pg_core_1.text)('asset_type').notNull(),
    purpose: (0, pg_core_1.text)('purpose').notNull(),
    urgency: (0, pg_core_1.text)('urgency').notNull(),
    notes: (0, pg_core_1.text)('notes'),
    status: (0, pg_core_1.text)('status').default('pending'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    employeeId: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => schema_1.employees.id),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('asset_requests_employee_id_idx').on(t.employeeId),
    (0, pg_core_1.index)('asset_requests_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('asset_requests_status_idx').on(t.status),
    (0, pg_core_1.index)('asset_requests_request_date_idx').on(t.requestDate),
    (0, pg_core_1.index)('asset_requests_asset_type_idx').on(t.assetType),
    (0, pg_core_1.index)('asset_requests_urgency_idx').on(t.urgency),
]);
//# sourceMappingURL=asset-requests.schema.js.map