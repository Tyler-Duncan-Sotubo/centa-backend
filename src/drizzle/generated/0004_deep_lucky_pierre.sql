CREATE TABLE "expo_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"expo_push_token" varchar(255) NOT NULL,
	"platform" varchar(16) DEFAULT 'unknown',
	"device_id" varchar(128),
	"app_version" varchar(64),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "expo_tokens" ADD CONSTRAINT "expo_tokens_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expo_tokens_token_unique" ON "expo_tokens" USING btree ("expo_push_token");--> statement-breakpoint
CREATE INDEX "expo_tokens_employee_idx" ON "expo_tokens" USING btree ("employee_id");