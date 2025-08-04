CREATE TABLE "performance_assessment_section_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"section" text,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_assessment_conclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"summary" text,
	"strengths" text,
	"areas_for_improvement" text,
	"final_score" integer,
	"promotion_recommendation" text,
	"potential_flag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "performance_assessment_conclusions_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "performance_assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'not_started',
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "performance_review_templates" RENAME COLUMN "include_skills" TO "include_attendance";--> statement-breakpoint
ALTER TABLE "performance_assessment_section_comments" ADD CONSTRAINT "performance_assessment_section_comments_assessment_id_performance_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."performance_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD CONSTRAINT "performance_assessment_conclusions_assessment_id_performance_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."performance_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessment_responses" ADD CONSTRAINT "performance_assessment_responses_assessment_id_performance_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."performance_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessment_responses" ADD CONSTRAINT "performance_assessment_responses_question_id_performance_review_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."performance_review_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_cycle_id_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."performance_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_template_id_performance_review_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."performance_review_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_section_comments_assessment_id_idx" ON "performance_assessment_section_comments" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_section_comments_section_idx" ON "performance_assessment_section_comments" USING btree ("section");--> statement-breakpoint
CREATE INDEX "assessment_responses_assessment_id_idx" ON "performance_assessment_responses" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_responses_question_id_idx" ON "performance_assessment_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "performance_assessments_company_id_idx" ON "performance_assessments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "performance_assessments_cycle_id_idx" ON "performance_assessments" USING btree ("cycle_id");