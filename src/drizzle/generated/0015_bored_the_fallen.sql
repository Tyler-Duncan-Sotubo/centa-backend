ALTER TABLE "loan_history" ALTER COLUMN "action_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_name_loans" ON "loans" USING btree ("name");--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_name_unique" UNIQUE("name");