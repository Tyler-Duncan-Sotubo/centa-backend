CREATE TABLE "company_allowances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"allowance_type" text NOT NULL,
	"allowance_percentage" integer NOT NULL,
	"created_at" date DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_allowances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_id" uuid NOT NULL,
	"allowance_type" text NOT NULL,
	"allowance_amount" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" DROP CONSTRAINT "employees_employee_number_unique";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "employee_number" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "employee_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "employment_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "nhf_contribution" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "nhf_contribution" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ADD COLUMN "basic" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ADD COLUMN "housing" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ADD COLUMN "transport" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ADD COLUMN "nhf_enrolled" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "salary_breakdown" ADD COLUMN "created_at" date DEFAULT now();--> statement-breakpoint
ALTER TABLE "company_allowances" ADD CONSTRAINT "company_allowances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_allowances" ADD CONSTRAINT "payroll_allowances_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "hourly_rate";--> statement-breakpoint
ALTER TABLE "salary_breakdown" DROP COLUMN "others";