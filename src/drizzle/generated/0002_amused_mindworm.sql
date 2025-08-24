ALTER TABLE "performance_goals" ADD COLUMN "employee_group_id" uuid;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_employee_group_id_employee_groups_id_fk" FOREIGN KEY ("employee_group_id") REFERENCES "public"."employee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_goals_employee_id" ON "performance_goals" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_goals_employee_group_id" ON "performance_goals" USING btree ("employee_group_id");