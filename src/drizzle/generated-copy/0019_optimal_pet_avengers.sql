CREATE TABLE "performance_appraisal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appraisal_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"expected_level_id" uuid NOT NULL,
	"employee_level_id" uuid,
	"manager_level_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "performance_appraisal_grades" CASCADE;--> statement-breakpoint
ALTER TABLE "performance_appraisal_entries" ADD CONSTRAINT "performance_appraisal_entries_appraisal_id_performance_appraisals_id_fk" FOREIGN KEY ("appraisal_id") REFERENCES "public"."performance_appraisals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisal_entries" ADD CONSTRAINT "performance_appraisal_entries_competency_id_performance_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."performance_competencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisal_entries" ADD CONSTRAINT "performance_appraisal_entries_expected_level_id_performance_competency_levels_id_fk" FOREIGN KEY ("expected_level_id") REFERENCES "public"."performance_competency_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisal_entries" ADD CONSTRAINT "performance_appraisal_entries_employee_level_id_performance_competency_levels_id_fk" FOREIGN KEY ("employee_level_id") REFERENCES "public"."performance_competency_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_appraisal_entries" ADD CONSTRAINT "performance_appraisal_entries_manager_level_id_performance_competency_levels_id_fk" FOREIGN KEY ("manager_level_id") REFERENCES "public"."performance_competency_levels"("id") ON DELETE set null ON UPDATE no action;