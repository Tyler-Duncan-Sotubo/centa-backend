"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetApprovals = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const asset_requests_schema_1 = require("./asset-requests.schema");
exports.assetApprovals = (0, pg_core_1.pgTable)('asset_approvals', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    assetRequestId: (0, pg_core_1.uuid)('asset_id')
        .notNull()
        .references(() => asset_requests_schema_1.assetRequests.id, { onDelete: 'cascade' }),
    stepId: (0, pg_core_1.uuid)('step_id')
        .notNull()
        .references(() => schema_1.approvalSteps.id, { onDelete: 'cascade' }),
    actorId: (0, pg_core_1.uuid)('actor_id')
        .notNull()
        .references(() => schema_1.users.id, { onDelete: 'cascade' }),
    action: (0, pg_core_1.varchar)('action', { length: 50 }).notNull(),
    remarks: (0, pg_core_1.text)('remarks'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('asset_approvals_asset_request_id_idx').on(t.assetRequestId),
    (0, pg_core_1.index)('asset_approvals_step_id_idx').on(t.stepId),
    (0, pg_core_1.index)('asset_approvals_actor_id_idx').on(t.actorId),
    (0, pg_core_1.index)('asset_approvals_action_idx').on(t.action),
]);
//# sourceMappingURL=asset-approval.schema.js.map