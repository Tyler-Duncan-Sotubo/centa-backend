CREATE TABLE "termination_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer DEFAULT 0,
	"is_asset_return_step" boolean DEFAULT false,
	"is_global" boolean DEFAULT false,
	"company_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "termination_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"checklist_item_id" uuid NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "termination_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false,
	"company_id" uuid
);
--> statement-breakpoint
CREATE TABLE "termination_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"termination_type_id" uuid,
	"termination_reason_id" uuid,
	"notes" text,
	"status" varchar(20) DEFAULT 'in_progress',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "termination_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false,
	"company_id" uuid
);
--> statement-breakpoint
ALTER TABLE "termination_checklist_items" ADD CONSTRAINT "termination_checklist_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_progress" ADD CONSTRAINT "termination_progress_session_id_termination_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."termination_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_progress" ADD CONSTRAINT "termination_progress_checklist_item_id_termination_checklist_items_id_fk" FOREIGN KEY ("checklist_item_id") REFERENCES "public"."termination_checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_reasons" ADD CONSTRAINT "termination_reasons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_sessions" ADD CONSTRAINT "termination_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_sessions" ADD CONSTRAINT "termination_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_sessions" ADD CONSTRAINT "termination_sessions_termination_type_id_termination_types_id_fk" FOREIGN KEY ("termination_type_id") REFERENCES "public"."termination_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_sessions" ADD CONSTRAINT "termination_sessions_termination_reason_id_termination_reasons_id_fk" FOREIGN KEY ("termination_reason_id") REFERENCES "public"."termination_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "termination_types" ADD CONSTRAINT "termination_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "termination_checklist_company_id_idx" ON "termination_checklist_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "termination_checklist_is_global_idx" ON "termination_checklist_items" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "termination_checklist_name_idx" ON "termination_checklist_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "termination_progress_session_id_idx" ON "termination_progress" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "termination_progress_checklist_item_id_idx" ON "termination_progress" USING btree ("checklist_item_id");--> statement-breakpoint
CREATE INDEX "termination_reasons_company_id_idx" ON "termination_reasons" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "termination_reasons_is_global_idx" ON "termination_reasons" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "termination_reasons_name_idx" ON "termination_reasons" USING btree ("name");--> statement-breakpoint
CREATE INDEX "termination_sessions_employee_id_idx" ON "termination_sessions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "termination_sessions_company_id_idx" ON "termination_sessions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "termination_sessions_status_idx" ON "termination_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "termination_types_company_id_idx" ON "termination_types" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "termination_types_is_global_idx" ON "termination_types" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "termination_types_name_idx" ON "termination_types" USING btree ("name");