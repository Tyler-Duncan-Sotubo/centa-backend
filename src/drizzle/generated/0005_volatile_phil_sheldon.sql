ALTER TABLE "performance_goals" DROP CONSTRAINT "performance_goals_owner_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_goals" ADD CONSTRAINT "performance_goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;