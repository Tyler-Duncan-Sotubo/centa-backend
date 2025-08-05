export declare const JobStatus: import("drizzle-orm/pg-core").PgEnum<["draft", "open", "closed", "archived"]>;
export declare const AppStatus: import("drizzle-orm/pg-core").PgEnum<["applied", "screening", "interview", "offer", "hired", "rejected"]>;
export declare const InterviewStage: import("drizzle-orm/pg-core").PgEnum<["phone_screen", "tech", "onsite", "final"]>;
export declare const CandidateSource: import("drizzle-orm/pg-core").PgEnum<["job_board", "referral", "agency", "career_page", "headhunter", "other"]>;
export declare const OfferStatus: import("drizzle-orm/pg-core").PgEnum<["pending", "accepted", "sent", "declined", "expired"]>;
export declare const applicationSourceEnum: import("drizzle-orm/pg-core").PgEnum<["career_page", "linkedin", "indeed", "referral", "agency", "internal", "other"]>;
export declare const jobTypeEnum: import("drizzle-orm/pg-core").PgEnum<["onsite", "remote", "hybrid"]>;
export declare const employmentTypeEnum: import("drizzle-orm/pg-core").PgEnum<["permanent", "temporary", "contract", "internship", "freelance", "part_time", "full_time"]>;
export declare const applicationStyleEnum: import("drizzle-orm/pg-core").PgEnum<["resume_only", "form_only", "both"]>;
