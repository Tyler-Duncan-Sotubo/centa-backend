CREATE TABLE "daily_attendance_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"date" text NOT NULL,
	"total_employees" integer,
	"present" integer,
	"absent" integer,
	"late" integer,
	"attendance_rate" numeric(5, 2),
	"average_check_in_time" time,
	"attendance_change_percent" numeric(5, 2),
	"late_change_percent" numeric(5, 2),
	"average_check_in_time_today" time,
	"average_check_in_time_yesterday" time,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "daily_attendance_summary" ADD CONSTRAINT "daily_attendance_summary_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;