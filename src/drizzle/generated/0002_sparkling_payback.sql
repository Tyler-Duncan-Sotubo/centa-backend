CREATE TYPE "public"."direction" AS ENUM('at_least', 'at_most', 'increase_to', 'decrease_to', 'range');--> statement-breakpoint
CREATE TYPE "public"."kr_type" AS ENUM('metric', 'milestone', 'binary');--> statement-breakpoint
CREATE TYPE "public"."objective_status" AS ENUM('draft', 'active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."performance_checkin_cadence" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."performance_visibility" AS ENUM('private', 'manager', 'company');--> statement-breakpoint
CREATE TYPE "public"."scoring_method" AS ENUM('okr_classic', 'kpi_target', 'milestone_bool', 'milestone_pct');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('manual', 'system', 'integration');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'manager', 'company');--> statement-breakpoint
CREATE TABLE "kpi_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kpi_id" uuid NOT NULL,
	"value" numeric(18, 6) NOT NULL,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	"collected_by" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text NOT NULL,
	"direction" "direction" NOT NULL,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_progress_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid,
	"key_result_id" uuid,
	"value" text,
	"progress_pct" integer,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "kr_type" DEFAULT 'metric' NOT NULL,
	"scoring_method" "scoring_method" DEFAULT 'okr_classic' NOT NULL,
	"unit" text,
	"direction" "direction",
	"baseline" numeric(18, 6),
	"target" numeric(18, 6),
	"min_range" numeric(18, 6),
	"max_range" numeric(18, 6),
	"current" numeric(18, 6),
	"progress_pct" integer,
	"weight" integer,
	"owner_employee_id" uuid,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"source_ref" text,
	"start_date" date,
	"due_date" date,
	"is_archived" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"owner_employee_id" uuid,
	"owner_group_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "objective_status" DEFAULT 'draft' NOT NULL,
	"visibility" "visibility" DEFAULT 'company' NOT NULL,
	"weight" integer,
	"score" integer,
	"confidence" integer,
	"parent_objective_id" uuid,
	"start_date" date NOT NULL,
	"due_date" date NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid NOT NULL,
	"is_archived" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_checkin_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid,
	"key_result_id" uuid,
	"frequency" "performance_checkin_cadence" NOT NULL,
	"next_due_at" timestamp NOT NULL,
	"timezone" varchar(64),
	"anchor_dow" integer,
	"anchor_hour" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_okr_company_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"default_visibility" "performance_visibility" DEFAULT 'company' NOT NULL,
	"default_cadence" "performance_checkin_cadence" DEFAULT 'monthly' NOT NULL,
	"default_timezone" varchar(64),
	"default_anchor_dow" integer,
	"default_anchor_hour" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_okr_team_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"visibility" "performance_visibility",
	"cadence" "performance_checkin_cadence",
	"default_owner_is_lead" boolean DEFAULT true,
	"timezone" varchar(64),
	"anchor_dow" integer,
	"anchor_hour" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "performance_goal_updates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "performance_goal_updates" CASCADE;--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" DROP CONSTRAINT "performance_goal_attachments_goal_id_performance_goals_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_goal_comments" DROP CONSTRAINT "performance_goal_comments_goal_id_performance_goals_id_fk";
--> statement-breakpoint
DROP INDEX "idx_goal_attachments_goal_id";--> statement-breakpoint
DROP INDEX "idx_goal_comments_goal_id";--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" ALTER COLUMN "comment" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" ADD COLUMN "objective_id" uuid;--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" ADD COLUMN "key_result_id" uuid;--> statement-breakpoint
ALTER TABLE "performance_goal_comments" ADD COLUMN "objective_id" uuid;--> statement-breakpoint
ALTER TABLE "performance_goal_comments" ADD COLUMN "key_result_id" uuid;--> statement-breakpoint
ALTER TABLE "kpi_snapshots" ADD CONSTRAINT "kpi_snapshots_kpi_id_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_snapshots" ADD CONSTRAINT "kpi_snapshots_collected_by_users_id_fk" FOREIGN KEY ("collected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_progress_updates" ADD CONSTRAINT "performance_progress_updates_objective_id_performance_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."performance_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_progress_updates" ADD CONSTRAINT "performance_progress_updates_key_result_id_performance_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."performance_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_progress_updates" ADD CONSTRAINT "performance_progress_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_key_results" ADD CONSTRAINT "performance_key_results_objective_id_performance_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."performance_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_key_results" ADD CONSTRAINT "performance_key_results_owner_employee_id_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_objectives" ADD CONSTRAINT "performance_objectives_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_objectives" ADD CONSTRAINT "performance_objectives_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_objectives" ADD CONSTRAINT "performance_objectives_owner_employee_id_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_objectives" ADD CONSTRAINT "performance_objectives_owner_group_id_employee_groups_id_fk" FOREIGN KEY ("owner_group_id") REFERENCES "public"."employee_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_objectives" ADD CONSTRAINT "performance_objectives_parent_objective_id_performance_objectives_id_fk" FOREIGN KEY ("parent_objective_id") REFERENCES "public"."performance_objectives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_objectives" ADD CONSTRAINT "performance_objectives_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_checkin_schedules" ADD CONSTRAINT "performance_checkin_schedules_objective_id_performance_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."performance_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_checkin_schedules" ADD CONSTRAINT "performance_checkin_schedules_key_result_id_performance_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."performance_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_okr_company_policies" ADD CONSTRAINT "performance_okr_company_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_okr_team_policies" ADD CONSTRAINT "performance_okr_team_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_okr_team_policies" ADD CONSTRAINT "performance_okr_team_policies_group_id_employee_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."employee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kpi_snapshots_kpi_time" ON "kpi_snapshots" USING btree ("kpi_id","collected_at");--> statement-breakpoint
CREATE INDEX "idx_kpis_company" ON "kpis" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_krs_objective" ON "performance_key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_krs_owner" ON "performance_key_results" USING btree ("owner_employee_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_company_cycle" ON "performance_objectives" USING btree ("company_id","cycle_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_owner_emp" ON "performance_objectives" USING btree ("owner_employee_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_owner_group" ON "performance_objectives" USING btree ("owner_group_id");--> statement-breakpoint
CREATE INDEX "idx_performance_checkins_due" ON "performance_checkin_schedules" USING btree ("next_due_at");--> statement-breakpoint
CREATE INDEX "idx_performance_checkins_objective" ON "performance_checkin_schedules" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_performance_checkins_kr" ON "performance_checkin_schedules" USING btree ("key_result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_performance_checkin_per_objective" ON "performance_checkin_schedules" USING btree ("objective_id") WHERE "performance_checkin_schedules"."objective_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_performance_checkin_per_kr" ON "performance_checkin_schedules" USING btree ("key_result_id") WHERE "performance_checkin_schedules"."key_result_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_performance_okr_company_policies_company" ON "performance_okr_company_policies" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_performance_okr_company_policy_per_company" ON "performance_okr_company_policies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_performance_okr_team_policies_company_group" ON "performance_okr_team_policies" USING btree ("company_id","group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_performance_okr_team_policy_per_group" ON "performance_okr_team_policies" USING btree ("company_id","group_id");--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" ADD CONSTRAINT "performance_goal_attachments_objective_id_performance_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."performance_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" ADD CONSTRAINT "performance_goal_attachments_key_result_id_performance_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."performance_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_comments" ADD CONSTRAINT "performance_goal_comments_objective_id_performance_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."performance_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_comments" ADD CONSTRAINT "performance_goal_comments_key_result_id_performance_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."performance_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_goal_attachments_objective_id" ON "performance_goal_attachments" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_goal_attachments_key_result_id" ON "performance_goal_attachments" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_goal_comments_objective_id" ON "performance_goal_comments" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_goal_comments_key_result_id" ON "performance_goal_comments" USING btree ("key_result_id");--> statement-breakpoint
ALTER TABLE "performance_goal_attachments" DROP COLUMN "goal_id";--> statement-breakpoint
ALTER TABLE "performance_goal_comments" DROP COLUMN "goal_id";