CREATE TABLE "performance_goal_owners" (
	"goal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid
);
--> statement-breakpoint
ALTER TABLE "performance_goals" DROP CONSTRAINT "performance_goals_owner_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_goals_owner_id";--> statement-breakpoint
ALTER TABLE "performance_goal_owners" ADD CONSTRAINT "performance_goal_owners_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_owners" ADD CONSTRAINT "performance_goal_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_owners" ADD CONSTRAINT "performance_goal_owners_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_goal_owner_goal_id" ON "performance_goal_owners" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_goal_owner_user_id" ON "performance_goal_owners" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "performance_goals" DROP COLUMN "owner_id";