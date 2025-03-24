CREATE TABLE "ytd_payroll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"payroll_month" text NOT NULL,
	"year" integer NOT NULL,
	"gross_salary" integer NOT NULL,
	"total_deductions" integer NOT NULL,
	"bonuses" integer DEFAULT 0,
	"net_salary" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ytd_payroll" ADD CONSTRAINT "ytd_payroll_payroll_run_id_payroll_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ytd_payroll" ADD CONSTRAINT "ytd_payroll_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payroll_run_id_ytd_payroll" ON "ytd_payroll" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_ytd_payroll" ON "ytd_payroll" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_month_ytd_payroll" ON "ytd_payroll" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX "idx_year_ytd_payroll" ON "ytd_payroll" USING btree ("year");