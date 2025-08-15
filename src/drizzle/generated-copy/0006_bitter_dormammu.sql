CREATE TABLE "performance_feedback_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" text NOT NULL,
	"question" text NOT NULL,
	"input_type" text DEFAULT 'text',
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_feedback_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "performance_feedback_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"enable_employee_feedback" boolean DEFAULT true,
	"enable_manager_feedback" boolean DEFAULT true,
	"allow_anonymous" boolean DEFAULT false,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "performance_feedback_viewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"can_view" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "performance_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "performance_feedback_questions" ADD CONSTRAINT "performance_feedback_questions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback_responses" ADD CONSTRAINT "performance_feedback_responses_feedback_id_performance_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."performance_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback_settings" ADD CONSTRAINT "performance_feedback_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback_viewers" ADD CONSTRAINT "performance_feedback_viewers_feedback_id_performance_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."performance_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback_viewers" ADD CONSTRAINT "performance_feedback_viewers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback" ADD CONSTRAINT "performance_feedback_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback" ADD CONSTRAINT "performance_feedback_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_feedback" ADD CONSTRAINT "performance_feedback_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_feedback_question_feedback_id" ON "performance_feedback_responses" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_viewers_feedback_id" ON "performance_feedback_viewers" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_viewers_user_id" ON "performance_feedback_viewers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_recipient_id" ON "performance_feedback" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_sender_id" ON "performance_feedback" USING btree ("sender_id");