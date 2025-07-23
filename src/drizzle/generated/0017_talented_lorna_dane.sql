ALTER TABLE "job_postings" ADD COLUMN "deadline_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "job_postings" DROP COLUMN "department";--> statement-breakpoint
ALTER TABLE "job_postings" DROP COLUMN "requirements";