CREATE TABLE "performance_goal_kpi_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kpi_id" uuid NOT NULL,
	"captured_at" timestamp DEFAULT now() NOT NULL,
	"value" numeric(18, 4) NOT NULL,
	"note" text,
	"actor_id" uuid,
	"evidence_url" text
);
--> statement-breakpoint
CREATE TABLE "performance_goal_kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"direction" text DEFAULT 'up' NOT NULL,
	"unit" text DEFAULT 'number',
	"baseline" numeric(18, 4),
	"target" numeric(18, 4),
	"target_min" numeric(18, 4),
	"target_max" numeric(18, 4),
	"current" numeric(18, 4),
	"target_date" date,
	"weight" integer DEFAULT 100,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "performance_goal_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"completed_at" timestamp,
	"order" integer DEFAULT 0,
	"weight" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ADD CONSTRAINT "performance_goal_kpi_snapshots_kpi_id_performance_goal_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."performance_goal_kpis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_kpi_snapshots" ADD CONSTRAINT "performance_goal_kpi_snapshots_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_kpis" ADD CONSTRAINT "performance_goal_kpis_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_kpis" ADD CONSTRAINT "performance_goal_kpis_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_milestones" ADD CONSTRAINT "performance_goal_milestones_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kpi_snapshots_kpi_id" ON "performance_goal_kpi_snapshots" USING btree ("kpi_id");--> statement-breakpoint
CREATE INDEX "idx_kpis_goal_id" ON "performance_goal_kpis" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_kpis_is_primary" ON "performance_goal_kpis" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "idx_goal_milestones_goal_id" ON "performance_goal_milestones" USING btree ("goal_id");