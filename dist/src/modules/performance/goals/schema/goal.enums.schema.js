"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceVisibilityEnum = exports.performanceCadenceEnum = exports.scoringMethodEnum = exports.sourceEnum = exports.directionEnum = exports.krTypeEnum = exports.visibilityEnum = exports.objectiveStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.objectiveStatusEnum = (0, pg_core_1.pgEnum)('objective_status', [
    'draft',
    'active',
    'paused',
    'closed',
]);
exports.visibilityEnum = (0, pg_core_1.pgEnum)('visibility', [
    'private',
    'manager',
    'company',
]);
exports.krTypeEnum = (0, pg_core_1.pgEnum)('kr_type', [
    'metric',
    'milestone',
    'binary',
]);
exports.directionEnum = (0, pg_core_1.pgEnum)('direction', [
    'at_least',
    'at_most',
    'increase_to',
    'decrease_to',
    'range',
]);
exports.sourceEnum = (0, pg_core_1.pgEnum)('data_source', [
    'manual',
    'system',
    'integration',
]);
exports.scoringMethodEnum = (0, pg_core_1.pgEnum)('scoring_method', [
    'okr_classic',
    'kpi_target',
    'milestone_bool',
    'milestone_pct',
]);
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