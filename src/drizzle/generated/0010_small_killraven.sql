CREATE TYPE "public"."application_style" AS ENUM('resume_only', 'form_only', 'both');--> statement-breakpoint
CREATE TABLE "application_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"is_global" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "application_form_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"style" "application_style" NOT NULL,
	"include_references" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "application_form_configs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "application_form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"section" varchar(50) NOT NULL,
	"is_visible" boolean DEFAULT true,
	"is_editable" boolean DEFAULT true,
	"label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"required" boolean DEFAULT true,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_form_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"question" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"required" boolean DEFAULT true,
	"order" integer NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "currency" varchar(10) DEFAULT 'NGN' NOT NULL;--> statement-breakpoint
ALTER TABLE "application_form_configs" ADD CONSTRAINT "application_form_configs_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_fields" ADD CONSTRAINT "application_form_fields_form_id_application_form_configs_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_form_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_questions" ADD CONSTRAINT "application_form_questions_form_id_application_form_configs_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_form_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_questions" ADD CONSTRAINT "application_form_questions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;