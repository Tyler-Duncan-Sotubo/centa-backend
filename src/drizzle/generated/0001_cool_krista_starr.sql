CREATE TYPE "public"."group_type" AS ENUM('TEAM', 'PROJECT', 'INTEREST', 'SECURITY');--> statement-breakpoint
CREATE TYPE "public"."group_member_role" AS ENUM('member', 'lead', 'manager', 'contractor');--> statement-breakpoint
DROP INDEX "idx_employee_group_memberships";--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "role" "group_member_role" DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "title" varchar(120);--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "allocation_pct" integer;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_groups" ADD COLUMN "slug" varchar(120);--> statement-breakpoint
ALTER TABLE "employee_groups" ADD COLUMN "type" "group_type" DEFAULT 'TEAM' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_groups" ADD COLUMN "parent_group_id" uuid;--> statement-breakpoint
ALTER TABLE "employee_groups" ADD COLUMN "location" varchar(100);--> statement-breakpoint
ALTER TABLE "employee_groups" ADD COLUMN "timezone" varchar(64);--> statement-breakpoint
ALTER TABLE "employee_groups" ADD COLUMN "headcount_cap" integer;--> statement-breakpoint
ALTER TABLE "employee_groups" ADD CONSTRAINT "employee_groups_parent_group_id_employee_groups_id_fk" FOREIGN KEY ("parent_group_id") REFERENCES "public"."employee_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pk_group_membership_composite" ON "employee_group_memberships" USING btree ("group_id","employee_id");--> statement-breakpoint
CREATE INDEX "idx_group_memberships_group" ON "employee_group_memberships" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_group_memberships_employee" ON "employee_group_memberships" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_group_memberships_primary" ON "employee_group_memberships" USING btree ("employee_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_groups_company_type" ON "employee_groups" USING btree ("company_id","type");--> statement-breakpoint
CREATE INDEX "idx_groups_parent" ON "employee_groups" USING btree ("parent_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_groups_company_name" ON "employee_groups" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_groups_company_slug" ON "employee_groups" USING btree ("company_id","slug");