CREATE INDEX "payroll_emp_date_co_idx" ON "payroll" USING btree ("employee_id","payroll_date","company_id");--> statement-breakpoint
CREATE INDEX "payroll_co_date_idx" ON "payroll" USING btree ("company_id","payroll_date");--> statement-breakpoint
CREATE INDEX "payroll_run_emp_idx" ON "payroll" USING btree ("payroll_run_id","employee_id");--> statement-breakpoint
CREATE INDEX "payroll_co_month_idx" ON "payroll" USING btree ("company_id","payroll_month");--> statement-breakpoint
CREATE INDEX "payroll_co_status_date_idx" ON "payroll" USING btree ("company_id","approval_status","payroll_date");--> statement-breakpoint
CREATE INDEX "payroll_workflow_step_idx" ON "payroll" USING btree ("workflow_id","current_step");--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_emp_date_co_uniq" UNIQUE("employee_id","payroll_date","company_id");