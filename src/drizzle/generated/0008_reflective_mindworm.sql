CREATE TABLE "checklist_completion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"checklist_key" varchar NOT NULL,
	"completed_by" varchar NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "checklist_completion_company_id_idx" ON "checklist_completion" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "checklist_completion_checklist_key_idx" ON "checklist_completion" USING btree ("checklist_key");