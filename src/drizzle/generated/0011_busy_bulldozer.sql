CREATE TABLE "application_field_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"section" varchar(50) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"value" jsonb NOT NULL,
	"required" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "application_field_responses" ADD CONSTRAINT "application_field_responses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_question_responses" ADD CONSTRAINT "application_question_responses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" ADD CONSTRAINT "pipeline_stage_instances_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" ADD CONSTRAINT "pipeline_stage_instances_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_stage_instance_app" ON "pipeline_stage_instances" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_stage_instance_stage" ON "pipeline_stage_instances" USING btree ("stage_id");