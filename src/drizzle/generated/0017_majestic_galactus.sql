ALTER TABLE "loan_history" DROP CONSTRAINT "loan_history_employee_id_employees_id_fk";
--> statement-breakpoint
DROP INDEX "idx_employee_id_loan_history";--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "preferred_monthly_payment" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "loan_history" DROP COLUMN "employee_id";