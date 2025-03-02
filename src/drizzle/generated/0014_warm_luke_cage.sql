ALTER TABLE "loan_history" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loan_history" ALTER COLUMN "loan_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loan_history" ALTER COLUMN "employee_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "employee_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "repayments" ALTER COLUMN "loan_id" SET DATA TYPE uuid;--> statement-breakpoint
CREATE INDEX "idx_company_id_loan_history" ON "loan_history" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_loan_id_loan_history" ON "loan_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_loan_history" ON "loan_history" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_action_loan_history" ON "loan_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_created_at_loan_history" ON "loan_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_company_id_loans" ON "loans" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_loans" ON "loans" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_status_loans" ON "loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_loan_id_repayments" ON "repayments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_paid_at_repayments" ON "repayments" USING btree ("paid_at");