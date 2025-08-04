ALTER TABLE "performance_goal_owners" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "performance_goal_owners" CASCADE;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD COLUMN "employee_id" uuid;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;