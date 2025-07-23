CREATE TYPE "public"."application_status" AS ENUM('applied', 'screening', 'interview', 'offer', 'hired', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."candidate_source" AS ENUM('job_board', 'referral', 'agency', 'career_page', 'headhunter', 'other');--> statement-breakpoint
CREATE TYPE "public"."interview_stage" AS ENUM('phone_screen', 'tech', 'onsite', 'final');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."offer_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."application_source" AS ENUM('career_page', 'linkedin', 'indeed', 'referral', 'agency', 'internal', 'other');--> statement-breakpoint
CREATE TABLE "application_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status",
	"changed_at" timestamp with time zone DEFAULT now(),
	"changed_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"source" "application_source" DEFAULT 'career_page' NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now(),
	"current_stage" uuid,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "pipeline_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now(),
	"moved_by" uuid,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"source" "candidate_source" DEFAULT 'career_page' NOT NULL,
	"resume_url" varchar(500),
	"profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidate_skills" (
	"candidate_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_feedback" (
	"interview_id" uuid NOT NULL,
	"rating" integer,
	"comments" text,
	"feedback_by" uuid,
	"given_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"interviewer_id" uuid NOT NULL,
	"stage" "interview_stage" NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"duration_mins" integer NOT NULL,
	"location" varchar(255),
	"mode" varchar(50),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"external_job_id" varchar(100),
	"title" varchar(255) NOT NULL,
	"department" varchar(100),
	"location" varchar(100),
	"is_remote" boolean DEFAULT false NOT NULL,
	"description" text,
	"requirements" text,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"posted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"status" "offer_status" DEFAULT 'pending' NOT NULL,
	"salary" integer,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"start_date" date,
	"expires_at" timestamp with time zone,
	"letter_url" varchar(500),
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_template_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_global" boolean DEFAULT false,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_type" varchar(50) NOT NULL,
	"parent_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"name" varchar(255),
	"mime_type" varchar(100),
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_current_stage_pipeline_stages_id_fk" FOREIGN KEY ("current_stage") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_feedback_by_users_id_fk" FOREIGN KEY ("feedback_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_template_stages" ADD CONSTRAINT "pipeline_template_stages_template_id_pipeline_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_apphist_app" ON "application_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_app_job" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_app_cand" ON "applications" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_app_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pipehist_app" ON "pipeline_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_pipehist_stage" ON "pipeline_history" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_cand_email" ON "candidates" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_cand_source" ON "candidates" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_candskill_cand" ON "candidate_skills" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_ifeedback_int" ON "interview_feedback" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "idx_int_app" ON "interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_int_interp" ON "interviews" USING btree ("interviewer_id");--> statement-breakpoint
CREATE INDEX "idx_job_company" ON "job_postings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_job_status" ON "job_postings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_posted_at" ON "job_postings" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "idx_off_app" ON "offers" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_off_status" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_stage_job" ON "pipeline_stages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_stage_job_order" ON "pipeline_stages" USING btree ("job_id","order");--> statement-breakpoint
CREATE INDEX "idx_tplstg_template" ON "pipeline_template_stages" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_tplstg_template_order" ON "pipeline_template_stages" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "idx_att_parent" ON "attachments" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE INDEX "idx_att_upload" ON "attachments" USING btree ("uploaded_by");