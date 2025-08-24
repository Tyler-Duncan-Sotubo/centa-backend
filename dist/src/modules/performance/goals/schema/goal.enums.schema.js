"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceVisibilityEnum = exports.performanceCadenceEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.performanceCadenceEnum = (0, pg_core_1.pgEnum)('performance_checkin_cadence', [
    'weekly',
    'biweekly',
    'monthly',
]);
exports.performanceVisibilityEnum = (0, pg_core_1.pgEnum)('performance_visibility', [
    'private',
    'manager',
    'company',
]);
//# sourceMappingURL=goal.enums.schema.js.map