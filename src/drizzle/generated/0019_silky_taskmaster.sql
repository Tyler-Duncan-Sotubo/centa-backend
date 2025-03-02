ALTER TABLE "loans" RENAME TO "salary_advance";--> statement-breakpoint
ALTER TABLE "loan_history" RENAME TO "salary_advance_history";--> statement-breakpoint
ALTER TABLE "salary_advance_history" DROP CONSTRAINT "loan_history_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance_history" DROP CONSTRAINT "loan_history_loan_id_loans_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance_history" DROP CONSTRAINT "loan_history_action_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance" DROP CONSTRAINT "loans_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance" DROP CONSTRAINT "loans_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "repayments" DROP CONSTRAINT "repayments_loan_id_loans_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_loan_id_salary_advance_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."salary_advance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_action_by_users_id_fk" FOREIGN KEY ("action_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance" ADD CONSTRAINT "salary_advance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance" ADD CONSTRAINT "salary_advance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loan_id_salary_advance_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."salary_advance"("id") ON DELETE no action ON UPDATE no action;