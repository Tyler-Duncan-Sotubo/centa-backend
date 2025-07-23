ALTER TABLE "application_history" DROP CONSTRAINT "application_history_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_candidate_id_candidates_id_fk";
--> statement-breakpoint
ALTER TABLE "candidate_skills" DROP CONSTRAINT "candidate_skills_candidate_id_candidates_id_fk";
--> statement-breakpoint
ALTER TABLE "candidate_skills" DROP CONSTRAINT "candidate_skills_skill_id_skills_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" DROP CONSTRAINT "pipeline_stage_instances_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" DROP CONSTRAINT "pipeline_stage_instances_stage_id_pipeline_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_stages" DROP CONSTRAINT "pipeline_stages_job_id_job_postings_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_template_stages" DROP CONSTRAINT "pipeline_template_stages_template_id_pipeline_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" ADD CONSTRAINT "pipeline_stage_instances_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" ADD CONSTRAINT "pipeline_stage_instances_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_template_stages" ADD CONSTRAINT "pipeline_template_stages_template_id_pipeline_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE cascade ON UPDATE no action;