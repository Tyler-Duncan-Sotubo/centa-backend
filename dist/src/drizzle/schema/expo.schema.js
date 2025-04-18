"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expo_tokens = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const employee_schema_1 = require("./employee.schema");
exports.expo_tokens = (0, pg_core_1.pgTable)('expo_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    employee_id: (0, pg_core_1.uuid)('employee_id')
        .notNull()
        .references(() => employee_schema_1.employees.id, { onDelete: 'cascade' }),
    expoPushToken: (0, pg_core_1.text)('expo_push_token'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=expo.schema.js.map