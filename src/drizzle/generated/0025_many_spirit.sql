CREATE TABLE "interview_email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"is_global" boolean DEFAULT false,
	"company_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "email_template_id" uuid;--> statement-breakpoint
ALTER TABLE "interview_email_templates" ADD CONSTRAINT "interview_email_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_email_template_id_interview_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."interview_email_templates"("id") ON DELETE set null ON UPDATE no action;