CREATE TABLE "pay_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"pay_schedule" jsonb,
	"pay_frequency" text DEFAULT 'monthly' NOT NULL,
	"weekend_adjustment" text DEFAULT 'none' NOT NULL,
	"holiday_adjustment" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pay_schedules" ADD CONSTRAINT "pay_schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pay_schedules_company_id_idx" ON "pay_schedules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pay_schedules_pay_schedule_idx" ON "pay_schedules" USING btree ("pay_schedule");--> statement-breakpoint
CREATE INDEX "pay_schedules_start_date_idx" ON "pay_schedules" USING btree ("start_date");