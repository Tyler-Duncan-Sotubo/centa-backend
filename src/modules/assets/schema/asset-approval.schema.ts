import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
} from 'drizzle-orm/pg-core';
import { approvalSteps, users } from 'src/drizzle/schema';
import { assetRequests } from './asset-requests.schema';

export const assetApprovals = pgTable(
  'asset_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetRequestId: uuid('asset_id')
      .notNull()
      .references(() => assetRequests.id, { onDelete: 'cascade' }),

    stepId: uuid('step_id')
      .notNull()
      .references(() => approvalSteps.id, { onDelete: 'cascade' }),

    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    action: varchar('action', { length: 50 }).notNull(),
    remarks: text('remarks'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('asset_approvals_asset_request_id_idx').on(t.assetRequestId),
    index('asset_approvals_step_id_idx').on(t.stepId),
    index('asset_approvals_actor_id_idx').on(t.actorId),
    index('asset_approvals_action_idx').on(t.action),
  ],
);
