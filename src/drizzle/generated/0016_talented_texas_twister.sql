CREATE TYPE "public"."location_type" AS ENUM('OFFICE', 'HOME', 'REMOTE');--> statement-breakpoint
ALTER TABLE "company_locations" ADD COLUMN "location_type" "location_type" DEFAULT 'OFFICE' NOT NULL;