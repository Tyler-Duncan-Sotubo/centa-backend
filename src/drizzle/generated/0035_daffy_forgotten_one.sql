ALTER TABLE "ytd_payroll" RENAME COLUMN "payroll_run_id" TO "payroll_id";--> statement-breakpoint
ALTER TABLE "ytd_payroll" DROP CONSTRAINT "ytd_payroll_payroll_run_id_payroll_id_fk";
--> statement-breakpoint
DROP INDEX "idx_payroll_run_id_ytd_payroll";--> statement-breakpoint
ALTER TABLE "ytd_payroll" ADD CONSTRAINT "ytd_payroll_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payroll_run_id_ytd_payroll" ON "ytd_payroll" USING btree ("payroll_id");