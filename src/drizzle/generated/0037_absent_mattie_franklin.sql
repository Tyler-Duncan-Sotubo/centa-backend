ALTER TABLE "employees" ADD COLUMN "apply_nhf" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "departments" DROP COLUMN "is_demo";--> statement-breakpoint
ALTER TABLE "employees" DROP COLUMN "is_demo";