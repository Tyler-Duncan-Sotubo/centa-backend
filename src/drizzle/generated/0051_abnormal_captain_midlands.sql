CREATE TABLE "attendance_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grace_period_mins" integer DEFAULT 10,
	"penalty_after_mins" integer DEFAULT 10,
	"penalty_amount" integer DEFAULT 200,
	"early_leave_threshold_mins" integer DEFAULT 15,
	"absence_threshold_hours" integer DEFAULT 4,
	"count_weekends" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_hours_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_minutes" integer DEFAULT 60,
	"work_days" text[] DEFAULT '{"Mon","Tue","Wed","Thu","Fri"}',
	"created_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_rules" ADD CONSTRAINT "attendance_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_hours_settings" ADD CONSTRAINT "work_hours_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;