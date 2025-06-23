import {
  bigint,
  decimal,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { payGroups } from './pay-groups.schema';

export const payGroupAllowances = pgTable(
  'pay_group_allowances',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    payGroupId: uuid('pay_group_id')
      .notNull()
      .references(() => payGroups.id, { onDelete: 'cascade' }),

    // Allowance name (e.g. 'basic', 'housing', 'utility', 'data-stipend', etc)
    allowanceType: text('allowance_type').notNull(),

    // Are we storing a percentage or a fixed kobo amount?
    valueType: text('value_type').notNull().default('percentage'), // 'percentage' or 'fixed'

    // If percentage: e.g. 30.00 for 30%
    percentage: decimal('percentage', { precision: 5, scale: 2 }).default(
      '0.00',
    ),

    // If fixed: store actual kobo amount, e.g. 50000 for ₦500.00
    fixedAmount: bigint('fixed_amount', { mode: 'number' }).default(0),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [
    index('pay_group_allowances_pay_group_id_idx').on(t.payGroupId),
    index('pay_group_allowances_allowance_type_idx').on(t.allowanceType),
    index('pay_group_allowances_value_type_idx').on(t.valueType),
    index('pay_group_allowances_created_at_idx').on(t.createdAt),
  ],
);
