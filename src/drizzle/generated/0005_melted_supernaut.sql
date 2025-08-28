CREATE TABLE "expo_push_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid,
	"expo_push_token" text NOT NULL,
	"platform" text NOT NULL,
	"device_id" text,
	"app_version" text,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expo_notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"push_device_id" uuid NOT NULL,
	"expo_ticket_id" text,
	"expo_receipt_id" text,
	"receipt_status" text,
	"receipt_error" text,
	"receipt_details" jsonb,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expo_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"body" text,
	"type" text NOT NULL,
	"route" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"url" text,
	"read_at" timestamp,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"badge_at_send" integer,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "expo_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "expo_push_devices" ADD CONSTRAINT "expo_push_devices_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_push_devices" ADD CONSTRAINT "expo_push_devices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_notification_deliveries" ADD CONSTRAINT "expo_notification_deliveries_notification_id_expo_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."expo_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_notification_deliveries" ADD CONSTRAINT "expo_notification_deliveries_push_device_id_expo_push_devices_id_fk" FOREIGN KEY ("push_device_id") REFERENCES "public"."expo_push_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_notifications" ADD CONSTRAINT "expo_notifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expo_notifications" ADD CONSTRAINT "expo_notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_devices_employee_id_idx" ON "expo_push_devices" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "push_devices_company_id_idx" ON "expo_push_devices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "push_devices_token_idx" ON "expo_push_devices" USING btree ("expo_push_token");--> statement-breakpoint
CREATE INDEX "push_devices_platform_idx" ON "expo_push_devices" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "notif_deliveries_notification_id_idx" ON "expo_notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notif_deliveries_push_device_id_idx" ON "expo_notification_deliveries" USING btree ("push_device_id");--> statement-breakpoint
CREATE INDEX "notif_deliveries_ticket_idx" ON "expo_notification_deliveries" USING btree ("expo_ticket_id");--> statement-breakpoint
CREATE INDEX "notif_deliveries_receipt_idx" ON "expo_notification_deliveries" USING btree ("expo_receipt_id");--> statement-breakpoint
CREATE INDEX "expo_notifications_employee_id_idx" ON "expo_notifications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "expo_notifications_company_id_idx" ON "expo_notifications" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "expo_notifications_type_idx" ON "expo_notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "expo_notifications_created_at_idx" ON "expo_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expo_notifications_read_at_idx" ON "expo_notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "expo_notifications_archived_idx" ON "expo_notifications" USING btree ("is_archived");