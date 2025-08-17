export declare const objectiveStatusEnum: import("drizzle-orm/pg-core").PgEnum<["draft", "active", "paused", "closed"]>;
export declare const visibilityEnum: import("drizzle-orm/pg-core").PgEnum<["private", "manager", "company"]>;
export declare const krTypeEnum: import("drizzle-orm/pg-core").PgEnum<["metric", "milestone", "binary"]>;
export declare const directionEnum: import("drizzle-orm/pg-core").PgEnum<["at_least", "at_most", "increase_to", "decrease_to", "range"]>;
export declare const sourceEnum: import("drizzle-orm/pg-core").PgEnum<["manual", "system", "integration"]>;
export declare const scoringMethodEnum: import("drizzle-orm/pg-core").PgEnum<["okr_classic", "kpi_target", "milestone_bool", "milestone_pct"]>;
export declare const performanceCadenceEnum: import("drizzle-orm/pg-core").PgEnum<["weekly", "biweekly", "monthly"]>;
export declare const performanceVisibilityEnum: import("drizzle-orm/pg-core").PgEnum<["private", "manager", "company"]>;
