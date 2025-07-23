ALTER TABLE "interviews" DROP CONSTRAINT "interviews_scorecard_template_id_scorecard_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD COLUMN "scorecard_template_id" uuid;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_scorecard_template_id_scorecard_templates_id_fk" FOREIGN KEY ("scorecard_template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" DROP COLUMN "scorecard_template_id";