CREATE TABLE "employee_termination_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_asset_return_step" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "termination_progress" CASCADE;--> statement-breakpoint
ALTER TABLE "employee_termination_checklist" ADD CONSTRAINT "employee_termination_checklist_session_id_termination_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."termination_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_termination_checklist_session_id_idx" ON "employee_termination_checklist" USING btree ("session_id");