CREATE TABLE "performance_assessment_self_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_assessment_self_summaries" ADD CONSTRAINT "performance_assessment_self_summaries_assessment_id_performance_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."performance_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessment_self_summaries" ADD CONSTRAINT "performance_assessment_self_summaries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_assessment_self_summaries" ADD CONSTRAINT "performance_assessment_self_summaries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_self_summary_assessment_id" ON "performance_assessment_self_summaries" USING btree ("assessment_id");