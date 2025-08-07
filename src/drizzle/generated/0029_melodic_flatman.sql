ALTER TABLE "termination_sessions" ADD COLUMN "termination_date" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "termination_sessions" ADD COLUMN "eligible_for_rehire" boolean DEFAULT true;