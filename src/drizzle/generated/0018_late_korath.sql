CREATE TABLE "attendance_breaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"attendance_record_id" uuid NOT NULL,
	"break_start" timestamp with time zone NOT NULL,
	"break_end" timestamp with time zone,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_breaks" ADD CONSTRAINT "attendance_breaks_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_breaks_company_idx" ON "attendance_breaks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "attendance_breaks_attendance_idx" ON "attendance_breaks" USING btree ("attendance_record_id");--> statement-breakpoint
CREATE INDEX "attendance_breaks_attendance_start_idx" ON "attendance_breaks" USING btree ("attendance_record_id","break_start");--> statement-breakpoint
CREATE INDEX "company_name_idx" ON "performance_cycles" USING btree ("company_id","name");