CREATE TABLE "performance_appraisal_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_appraisal_grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appraisal_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"expected_level_id" integer NOT NULL,
	"employee_level_id" integer,
	"manager_level_id" integer
);
--> statement-breakpoint
CREATE TABLE "performance_appraisals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"submitted_by_employee" boolean DEFAULT false,
	"submitted_by_manager" boolean DEFAULT false,
	"finalized" boolean DEFAULT false,
	"final_score" integer,
	"promotion_recommendation" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_competency_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"weight" integer NOT NULL,
	CONSTRAINT "performance_competency_levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "performance_role_competency_expectations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"role_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"expected_level_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_appraisal_cycles" ADD CONSTRAINT "performance_appraisal_cycles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisal_grades" ADD CONSTRAINT "performance_appraisal_grades_appraisal_id_performance_appraisals_id_fk" FOREIGN KEY ("appraisal_id") REFERENCES "public"."performance_appraisals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisals" ADD CONSTRAINT "performance_appraisals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisals" ADD CONSTRAINT "performance_appraisals_cycle_id_performance_appraisal_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_appraisal_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_role_competency_expectations" ADD CONSTRAINT "performance_role_competency_expectations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_role_competency_expectations" ADD CONSTRAINT "performance_role_competency_expectations_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_role_competency_expectations" ADD CONSTRAINT "performance_role_competency_expectations_competency_id_performance_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."performance_competencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_role_competency_expectations" ADD CONSTRAINT "performance_role_competency_expectations_expected_level_id_performance_competency_levels_id_fk" FOREIGN KEY ("expected_level_id") REFERENCES "public"."performance_competency_levels"("id") ON DELETE no action ON UPDATE no action;