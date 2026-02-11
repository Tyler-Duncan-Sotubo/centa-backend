CREATE TYPE "public"."conclusion_review_status" AS ENUM('draft', 'pending_hr', 'needs_changes', 'approved');--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "review_status" "conclusion_review_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "submitted_to_hr_at" timestamp;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "submitted_to_hr_by" uuid;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "changes_requested_at" timestamp;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "changes_requested_by" uuid;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "changes_request_note" text;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "hr_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "performance_assessment_conclusions" ADD COLUMN "hr_approved_by" uuid;--> statement-breakpoint
CREATE INDEX "idx_assessment_conclusions_assessment_id" ON "performance_assessment_conclusions" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_conclusions_review_status" ON "performance_assessment_conclusions" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "idx_assessment_conclusions_pending_hr" ON "performance_assessment_conclusions" USING btree ("review_status","submitted_to_hr_at");--> statement-breakpoint
CREATE INDEX "idx_assessment_conclusions_needs_changes" ON "performance_assessment_conclusions" USING btree ("review_status","changes_requested_at");--> statement-breakpoint
CREATE INDEX "idx_assessment_conclusions_submitted_by" ON "performance_assessment_conclusions" USING btree ("submitted_to_hr_by");--> statement-breakpoint
CREATE INDEX "idx_assessment_conclusions_hr_approved_by" ON "performance_assessment_conclusions" USING btree ("hr_approved_by");