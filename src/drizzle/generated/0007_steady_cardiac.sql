CREATE TYPE "public"."employment_type" AS ENUM('permanent', 'temporary', 'contract', 'internship', 'freelance', 'part_time', 'full_time');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('onsite', 'remote', 'hybrid');--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "country" varchar(100);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "job_type" "job_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "employment_type" "employment_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "experience_level" varchar(50);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "years_of_experience" varchar(50);--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "education_level" varchar(50);--> statement-breakpoint
ALTER TABLE "job_postings" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "job_postings" DROP COLUMN "is_remote";--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_external_job_id_unique" UNIQUE("external_job_id");