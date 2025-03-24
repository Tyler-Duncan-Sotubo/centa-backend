ALTER TABLE "salary_advance" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "salary_advance" ADD COLUMN "payment_status" text DEFAULT 'open' NOT NULL;