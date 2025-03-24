CREATE TABLE "pay_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"apply_paye" boolean DEFAULT false,
	"apply_pension" boolean DEFAULT false,
	"apply_nhf" boolean DEFAULT false,
	"apply_additional" boolean DEFAULT false,
	"is_demo" boolean DEFAULT false,
	"pay_schedule_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL,
	CONSTRAINT "pay_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "employee_groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "employee_groups" CASCADE;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "pay_groups" ADD CONSTRAINT "pay_groups_pay_schedule_id_pay_schedules_id_fk" FOREIGN KEY ("pay_schedule_id") REFERENCES "public"."pay_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_groups" ADD CONSTRAINT "pay_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_name_employee_groups" ON "pay_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_company_id_employee_groups" ON "pay_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_pay_schedule_id_employee_groups" ON "pay_groups" USING btree ("pay_schedule_id");--> statement-breakpoint
