
CREATE TABLE "performance_goal_checkin_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"frequency" "performance_checkin_cadence" NOT NULL,
	"next_due_at" timestamp with time zone NOT NULL,
	"timezone" varchar(64),
	"anchor_dow" integer,
	"anchor_hour" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_goal_company_policies" (
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
ALTER TABLE "performance_goal_checkin_schedules" ADD CONSTRAINT "performance_goal_checkin_schedules_goal_id_performance_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."performance_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_goal_company_policies" ADD CONSTRAINT "performance_goal_company_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_goal_checkins_due" ON "performance_goal_checkin_schedules" USING btree ("next_due_at");--> statement-breakpoint
CREATE INDEX "idx_goal_checkins_goal" ON "performance_goal_checkin_schedules" USING btree ("goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_goal_checkin_per_goal" ON "performance_goal_checkin_schedules" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_goal_company_policies_company" ON "performance_goal_company_policies" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_goal_company_policy_per_company" ON "performance_goal_company_policies" USING btree ("company_id");