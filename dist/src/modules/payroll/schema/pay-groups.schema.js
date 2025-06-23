"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payGroups = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../../drizzle/schema");
const pay_schedules_schema_1 = require("./pay-schedules.schema");
exports.payGroups = (0, pg_core_1.pgTable)('pay_groups', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)('name').notNull().unique(),
    applyPaye: (0, pg_core_1.boolean)('apply_paye').default(false),
    applyPension: (0, pg_core_1.boolean)('apply_pension').default(false),
    applyNhf: (0, pg_core_1.boolean)('apply_nhf').default(false),
    payScheduleId: (0, pg_core_1.uuid)('pay_schedule_id')
        .notNull()
        .references(() => pay_schedules_schema_1.paySchedules.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
}, (t) => [
    (0, pg_core_1.index)('pay_groups_name_idx').on(t.name),
    (0, pg_core_1.index)('pay_groups_pay_schedule_id_idx').on(t.payScheduleId),
    (0, pg_core_1.index)('pay_groups_company_id_idx').on(t.companyId),
    (0, pg_core_1.index)('pay_groups_created_at_idx').on(t.createdAt),
    (0, pg_core_1.index)('pay_groups_is_deleted_idx').on(t.isDeleted),
]);
//# sourceMappingURL=pay-groups.schema.js.map