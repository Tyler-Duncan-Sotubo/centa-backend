CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_entity_type" AS ENUM('goal', 'assessment', 'cycle', 'announcement', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel" "notification_channel" DEFAULT 'email' NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"entity_type" "notification_entity_type" DEFAULT 'other' NOT NULL,
	"entity_id" uuid,
	"recipient_user_id" uuid,
	"recipient_employee_id" uuid,
	"recipient_email" varchar(320),
	"dedupe_key" varchar(255) NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"payload" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"queued_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "notification_events_company_idx" ON "notification_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "notification_events_recipient_idx" ON "notification_events" USING btree ("recipient_user_id","recipient_employee_id");--> statement-breakpoint
CREATE INDEX "notification_events_entity_idx" ON "notification_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notification_events_type_idx" ON "notification_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "notification_events_status_idx" ON "notification_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_events_dedupe_key_uq" ON "notification_events" USING btree ("dedupe_key");