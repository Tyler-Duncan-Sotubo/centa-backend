DROP INDEX "idx_kpi_snapshots_kpi_id";--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ALTER COLUMN "captured_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ALTER COLUMN "value" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ALTER COLUMN "actor_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ADD COLUMN "goal_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ADD CONSTRAINT "performance_goal_kpi_snapshots_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kpi_snaps_goal_id" ON "performance_goal_kpi_snapshots" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_kpi_snaps_kpi_id" ON "performance_goal_kpi_snapshots" USING btree ("kpi_id");--> statement-breakpoint
CREATE INDEX "idx_kpi_snaps_goal_kpi_time" ON "performance_goal_kpi_snapshots" USING btree ("goal_id","kpi_id","captured_at");