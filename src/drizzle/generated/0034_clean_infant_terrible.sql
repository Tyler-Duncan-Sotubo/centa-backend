CREATE TABLE "company_file_folder_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"department_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_file_folder_offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"office_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_file_folder_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_file_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"permission_controlled" boolean DEFAULT false,
	"created_by" uuid,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "company_files" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "company_files" ADD COLUMN "uploaded_by" uuid;--> statement-breakpoint
ALTER TABLE "company_file_folder_departments" ADD CONSTRAINT "company_file_folder_departments_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_departments" ADD CONSTRAINT "company_file_folder_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_offices" ADD CONSTRAINT "company_file_folder_offices_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_offices" ADD CONSTRAINT "company_file_folder_offices_office_id_company_locations_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."company_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_roles" ADD CONSTRAINT "company_file_folder_roles_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_roles" ADD CONSTRAINT "company_file_folder_roles_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folders" ADD CONSTRAINT "company_file_folders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folders" ADD CONSTRAINT "company_file_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;