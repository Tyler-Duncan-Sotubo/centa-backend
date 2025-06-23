ALTER TABLE "payroll_ytd" ADD COLUMN "basic_salary" numeric(15, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_ytd" ADD COLUMN "housing_allowance" numeric(15, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll_ytd" ADD COLUMN "transport_allowance" numeric(15, 2) NOT NULL;