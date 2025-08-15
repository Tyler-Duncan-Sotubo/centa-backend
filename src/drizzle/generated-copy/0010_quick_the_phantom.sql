ALTER TABLE "performance_goal_owners" RENAME COLUMN "user_id" TO "employee_id";--> statement-breakpoint
ALTER TABLE "performance_goal_owners" DROP CONSTRAINT "performance_goal_owners_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_goal_owners" DROP CONSTRAINT "performance_goal_owners_assigned_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_goals" DROP CONSTRAINT "performance_goals_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_goals" DROP CONSTRAINT "performance_goals_updated_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_goal_owner_user_id";--> statement-breakpoint
ALTER TABLE "performance_goals" ADD COLUMN "assigned_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "performance_goals" ADD COLUMN "assigned_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_goal_owners" ADD CONSTRAINT "performance_goal_owners_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_goal_owner_employee_id" ON "performance_goal_owners" USING btree ("employee_id");--> statement-breakpoint
ALTER TABLE "performance_goal_owners" DROP COLUMN "assigned_at";--> statement-breakpoint
ALTER TABLE "performance_goal_owners" DROP COLUMN "assigned_by";--> statement-breakpoint
ALTER TABLE "performance_goals" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "performance_goals" DROP COLUMN "updated_by";--> statement-breakpoint
ALTER TABLE "performance_goals" DROP COLUMN "created_at";