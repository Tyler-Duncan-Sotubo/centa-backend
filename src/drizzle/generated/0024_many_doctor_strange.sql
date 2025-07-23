ALTER TABLE "applications" DROP CONSTRAINT "applications_job_id_job_postings_id_fk";
--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "application_form_configs" DROP CONSTRAINT "application_form_configs_job_id_job_postings_id_fk";
--> statement-breakpoint
ALTER TABLE "application_form_fields" DROP CONSTRAINT "application_form_fields_form_id_application_form_configs_id_fk";
--> statement-breakpoint
ALTER TABLE "application_form_questions" DROP CONSTRAINT "application_form_questions_form_id_application_form_configs_id_fk";
--> statement-breakpoint
ALTER TABLE "job_postings" DROP CONSTRAINT "job_postings_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "job_postings" DROP CONSTRAINT "job_postings_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_history" DROP CONSTRAINT "pipeline_history_application_id_applications_id_fk";
--> statement-breakpoint
ALTER TABLE "pipeline_history" DROP CONSTRAINT "pipeline_history_stage_id_pipeline_stages_id_fk";
--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "event_id" varchar(128);--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_configs" ADD CONSTRAINT "application_form_configs_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_fields" ADD CONSTRAINT "application_form_fields_form_id_application_form_configs_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_form_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_questions" ADD CONSTRAINT "application_form_questions_form_id_application_form_configs_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_form_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;