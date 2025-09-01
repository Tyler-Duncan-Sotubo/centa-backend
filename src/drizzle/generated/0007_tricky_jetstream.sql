ALTER TABLE "payslips" ADD COLUMN "checksum" text;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payslips" ADD COLUMN "reissued_at" timestamp;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_payroll_uk" UNIQUE("employee_id","payroll_id");