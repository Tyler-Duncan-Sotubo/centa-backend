"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payGroupAllowances = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const pay_groups_schema_1 = require("./pay-groups.schema");
exports.payGroupAllowances = (0, pg_core_1.pgTable)('pay_group_allowances', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    payGroupId: (0, pg_core_1.uuid)('pay_group_id')
        .notNull()
        .references(() => pay_groups_schema_1.payGroups.id, { onDelete: 'cascade' }),
    allowanceType: (0, pg_core_1.text)('allowance_type').notNull(),
    valueType: (0, pg_core_1.text)('value_type').notNull().default('percentage'),
    percentage: (0, pg_core_1.decimal)('percentage', { precision: 5, scale: 2 }).default('0.00'),
    fixedAmount: (0, pg_core_1.bigint)('fixed_amount', { mode: 'number' }).default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('pay_group_allowances_pay_group_id_idx').on(t.payGroupId),
    (0, pg_core_1.index)('pay_group_allowances_allowance_type_idx').on(t.allowanceType),
    (0, pg_core_1.index)('pay_group_allowances_value_type_idx').on(t.valueType),
    (0, pg_core_1.index)('pay_group_allowances_created_at_idx').on(t.createdAt),
]);
//# sourceMappingURL=pay-group-allowances.schema.js.map