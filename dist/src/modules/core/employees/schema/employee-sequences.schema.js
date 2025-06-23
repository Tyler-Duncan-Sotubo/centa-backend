"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeSequences = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_1 = require("../../schema");
exports.employeeSequences = (0, pg_core_1.pgTable)('employee_sequences', {
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .primaryKey()
        .references(() => schema_1.companies.id, { onDelete: 'cascade' }),
    nextNumber: (0, pg_core_1.integer)('next_number').notNull().default(1),
}, (t) => [(0, pg_core_1.index)('employee_sequences_next_number_idx').on(t.nextNumber)]);
//# sourceMappingURL=employee-sequences.schema.js.map