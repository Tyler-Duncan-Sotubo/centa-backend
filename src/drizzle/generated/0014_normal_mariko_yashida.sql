CREATE TABLE "scorecard_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" varchar(255),
	"max_score" integer DEFAULT 5 NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_system" boolean DEFAULT false,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "interview_feedback" ADD COLUMN "category" text NOT NULL;--> statement-breakpoint
ALTER TABLE "scorecard_criteria" ADD CONSTRAINT "scorecard_criteria_template_id_scorecard_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_templates" ADD CONSTRAINT "scorecard_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_scorecard_company" ON "scorecard_templates" USING btree ("company_id");