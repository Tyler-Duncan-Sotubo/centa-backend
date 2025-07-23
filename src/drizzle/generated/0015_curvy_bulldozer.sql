CREATE TABLE "interview_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_interviewers" (
	"interview_id" uuid NOT NULL,
	"interviewer_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_feedback" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "interview_feedback" CASCADE;--> statement-breakpoint
ALTER TABLE "interviews" DROP CONSTRAINT "interviews_interviewer_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_int_interp";--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "mode" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "meeting_link" varchar(512);--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "scorecard_template_id" uuid;--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "status" varchar(20) DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "interviews" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "responsibilities" text[];--> statement-breakpoint
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_criterion_id_scorecard_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."scorecard_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ii_interview" ON "interview_interviewers" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "idx_ii_interviewer" ON "interview_interviewers" USING btree ("interviewer_id");--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_scorecard_template_id_scorecard_templates_id_fk" FOREIGN KEY ("scorecard_template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" DROP COLUMN "interviewer_id";--> statement-breakpoint
ALTER TABLE "interviews" DROP COLUMN "location";