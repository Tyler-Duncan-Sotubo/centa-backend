CREATE TABLE "performance_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_review_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"competency_id" uuid,
	"question" text NOT NULL,
	"type" text NOT NULL,
	"is_mandatory" boolean DEFAULT false,
	"allow_notes" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_review_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"include_goals" boolean DEFAULT false,
	"include_skills" boolean DEFAULT false,
	"include_feedback" boolean DEFAULT false,
	"include_questionnaire" boolean DEFAULT false,
	"require_signature" boolean DEFAULT false,
	"restrict_visibility" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_template_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order" integer DEFAULT 0,
	"is_mandatory" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "performance_competencies" ADD CONSTRAINT "performance_competencies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_review_questions" ADD CONSTRAINT "performance_review_questions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_review_questions" ADD CONSTRAINT "performance_review_questions_competency_id_performance_competencies_id_fk" FOREIGN KEY ("competency_id") REFERENCES "public"."performance_competencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_review_templates" ADD CONSTRAINT "performance_review_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_template_questions" ADD CONSTRAINT "performance_template_questions_template_id_performance_review_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."performance_review_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_template_questions" ADD CONSTRAINT "performance_template_questions_question_id_performance_review_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."performance_review_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_performance_competencies_company_id" ON "performance_competencies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_performance_competencies_name" ON "performance_competencies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_performance_review_questions_company_id" ON "performance_review_questions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_performance_review_questions_competency" ON "performance_review_questions" USING btree ("competency_id");--> statement-breakpoint
CREATE INDEX "idx_performance_review_questions_is_global" ON "performance_review_questions" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "idx_performance_review_templates_company_id" ON "performance_review_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_performance_review_templates_default" ON "performance_review_templates" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_template_questions_template_id" ON "performance_template_questions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_template_questions_question_id" ON "performance_template_questions" USING btree ("question_id");