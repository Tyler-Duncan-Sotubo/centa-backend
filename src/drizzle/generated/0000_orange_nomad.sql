DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'history_type') THEN
    CREATE TYPE "public"."history_type" AS ENUM('employment', 'education', 'certification', 'promotion', 'transfer', 'termination');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_status') THEN
    CREATE TYPE "public"."onboarding_status" AS ENUM('pending', 'in_progress', 'completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_assignee') THEN
    CREATE TYPE "public"."checklist_assignee" AS ENUM('employee', 'hr', 'it', 'finance');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_status') THEN
    CREATE TYPE "public"."checklist_status" AS ENUM('pending', 'in_progress', 'completed', 'overdue', 'skipped', 'cancelled');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_template_status') THEN
    CREATE TYPE "public"."onboarding_template_status" AS ENUM('draft', 'published');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lifecycle_token_type') THEN
    CREATE TYPE "public"."lifecycle_token_type" AS ENUM('onboarding', 'offboarding');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_type') THEN
    CREATE TYPE "public"."rate_type" AS ENUM('fixed', 'percentage');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE "public"."application_status" AS ENUM('applied', 'screening', 'interview', 'offer', 'hired', 'rejected');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'candidate_source') THEN
    CREATE TYPE "public"."candidate_source" AS ENUM('job_board', 'referral', 'agency', 'career_page', 'headhunter', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_stage') THEN
    CREATE TYPE "public"."interview_stage" AS ENUM('phone_screen', 'tech', 'onsite', 'final');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE "public"."job_status" AS ENUM('draft', 'open', 'closed', 'archived');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    CREATE TYPE "public"."offer_status" AS ENUM('pending', 'accepted', 'declined', 'expired');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_source') THEN
    CREATE TYPE "public"."application_source" AS ENUM('career_page', 'linkedin', 'indeed', 'referral', 'agency', 'internal', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_style') THEN
    CREATE TYPE "public"."application_style" AS ENUM('resume_only', 'form_only', 'both');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
    CREATE TYPE "public"."employment_type" AS ENUM('permanent', 'temporary', 'contract', 'internship', 'freelance', 'part_time', 'full_time');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE "public"."job_type" AS ENUM('onsite', 'remote', 'hybrid');
  END IF;
END $$;

CREATE TABLE "announcement_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcement_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcement_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"image" varchar(255) DEFAULT '',
	"link" varchar(255) DEFAULT '',
	"published_at" timestamp,
	"expires_at" timestamp,
	"is_published" boolean DEFAULT false,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"department_id" uuid,
	"location_id" uuid,
	"category_id" uuid NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"description" text NOT NULL,
	"document_url" text,
	"status" text DEFAULT 'open',
	"reported_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_date" date NOT NULL,
	"asset_type" text NOT NULL,
	"purpose" text NOT NULL,
	"urgency" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"rejection_reason" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_id" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"model_name" varchar(255),
	"color" varchar(255),
	"specs" text,
	"category" varchar(255) NOT NULL,
	"manufacturer" varchar(255),
	"serial_number" varchar(255) NOT NULL,
	"purchase_price" numeric(10, 2) NOT NULL,
	"purchase_date" date NOT NULL,
	"depreciation_method" varchar(50),
	"warranty_expiry" date,
	"lend_date" date,
	"return_date" date,
	"useful_life_years" integer DEFAULT 3 NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid,
	"location_id" uuid NOT NULL,
	"status" varchar DEFAULT 'available' NOT NULL,
	"created_at" date DEFAULT now(),
	"updated_at" date DEFAULT now(),
	"is_deleted" boolean DEFAULT false,
	CONSTRAINT "assets_internal_id_unique" UNIQUE("internal_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"details" text,
	"changes" jsonb,
	"ip_address" varchar(45),
	"correlation_id" uuid
);
--> statement-breakpoint
CREATE TABLE "company_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "PasswordResetToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_used" boolean NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"avatar" varchar(500),
	"company_id" uuid NOT NULL,
	"company_role_id" uuid NOT NULL,
	"verification_code" varchar(6),
	"verification_code_expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_used" boolean NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benefit_plan_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"selected_coverage" text NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"is_opted_out" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "benefit_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "benefit_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"benefit_group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"coverage_options" jsonb NOT NULL,
	"cost" jsonb NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"split" text NOT NULL,
	"employer_contribution" integer DEFAULT 0
);
--> statement-breakpoint
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
CREATE TABLE "company_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"folder_id" uuid,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"type" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false,
	"name" varchar(255) NOT NULL,
	"street" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100),
	"postal_code" varchar(20),
	"time_zone" varchar(50),
	"locale" varchar(10) DEFAULT 'en-US' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_tax_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"tin" text NOT NULL,
	"vat_number" text,
	"nhf_code" text,
	"pension_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"country" varchar(100) NOT NULL,
	"currency" "currency_enum" DEFAULT 'NGN' NOT NULL,
	"reg_no" varchar(100) DEFAULT '' NOT NULL,
	"logo_url" varchar(255) DEFAULT '' NOT NULL,
	"primary_contact_name" varchar(255),
	"primary_contact_email" varchar(255),
	"primary_contact_phone" varchar(20),
	"subscription_plan" "plan_enum" DEFAULT 'free' NOT NULL,
	"trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"budget" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"company_id" uuid NOT NULL,
	"head_id" uuid,
	"parent_department_id" uuid,
	"cost_center_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"authority" text,
	"license_number" text,
	"issue_date" date,
	"expiry_date" date,
	"document_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_compensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"effective_date" text NOT NULL,
	"gross_salary" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"pay_frequency" varchar(20) DEFAULT 'Monthly' NOT NULL,
	"apply_nhf" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_dependents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"is_beneficiary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"template_id" uuid,
	"signed_url" text,
	"docusign_envelope_id" text,
	"status" text DEFAULT 'uploaded',
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_sequences" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" varchar(50) NOT NULL,
	"user_id" uuid NOT NULL,
	"department_id" uuid,
	"job_role_id" uuid,
	"manager_id" uuid,
	"cost_center_id" uuid,
	"company_location" uuid,
	"pay_group_id" uuid,
	"employment_status" "employee_status" DEFAULT 'active' NOT NULL,
	"employment_start_date" text NOT NULL,
	"employment_end_date" timestamp,
	"confirmed" boolean DEFAULT true,
	"probation_end_date" text,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "employee_financials" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"bank_name" varchar(200),
	"bank_account_number" varchar(200),
	"bank_account_name" varchar(200),
	"bank_branch" varchar(200),
	"currency" varchar(3) DEFAULT 'NGN',
	"tin" varchar(200),
	"pension_pin" varchar(200),
	"nhf_number" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_group_memberships" (
	"group_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "history_type" NOT NULL,
	"title" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"institution" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_of_birth" date,
	"gender" varchar(20),
	"marital_status" varchar(20),
	"address" text,
	"state" varchar(100),
	"country" varchar(100),
	"phone" text,
	"emergency_contact_name" varchar(100),
	"emergency_contact_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"employee_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"level" varchar(100),
	"description" text,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"purpose" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'Requested' NOT NULL,
	"submitted_at" timestamp with time zone,
	"receipt_url" text,
	"payment_method" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "google_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"google_email" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_type" varchar(32) NOT NULL,
	"scope" text NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"refresh_token_expiry" integer DEFAULT 604800,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "google_accounts_google_email_unique" UNIQUE("google_email")
);
--> statement-breakpoint
CREATE TABLE "blocked_leave_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reserved_leave_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid,
	"company_id" uuid,
	"leave_type_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"date" date NOT NULL,
	"year" text NOT NULL,
	"type" text NOT NULL,
	"country" varchar(100),
	"country_code" varchar(5),
	"is_working_day_override" boolean DEFAULT false,
	"source" varchar(50) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"entitlement" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"used" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"balance" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_leave_balance" UNIQUE("employee_id","leave_type_id","year")
);
--> statement-breakpoint
CREATE TABLE "leave_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"accrual_enabled" boolean DEFAULT false,
	"accrual_frequency" varchar(20),
	"accrual_amount" numeric(5, 2),
	"max_balance" integer,
	"allow_carryover" boolean DEFAULT false,
	"carryover_limit" integer,
	"only_confirmed_employees" boolean DEFAULT false,
	"gender_eligibility" varchar(10),
	"manual_entitlement" integer,
	"grant_on_start" boolean DEFAULT true,
	"eligibility_rules" jsonb,
	"is_splittable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"status" varchar(20) NOT NULL,
	"total_days" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"approver_id" uuid,
	"approved_at" timestamp,
	"requested_at" timestamp DEFAULT now(),
	"rejection_reason" text,
	"approval_chain" jsonb,
	"current_approval_index" integer DEFAULT 0,
	"approval_history" jsonb,
	"partial_day" varchar(10),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_paid" boolean DEFAULT true,
	"color_tag" varchar(10),
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "onboarding_status" DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_checklist_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"status" "checklist_status" DEFAULT 'pending',
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_template_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assignee" "checklist_assignee" DEFAULT 'employee',
	"order" integer DEFAULT 0,
	"due_days_after_start" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "onboarding_template_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"field_type" text NOT NULL,
	"required" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"tag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" "onboarding_template_status" DEFAULT 'draft',
	"is_global" boolean DEFAULT false,
	"company_id" uuid
);
--> statement-breakpoint
CREATE TABLE "employee_lifecycle_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"token" text NOT NULL,
	"type" "lifecycle_token_type" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_lifecycle_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"read" text DEFAULT 'false' NOT NULL,
	"url" text NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "off_cycle_payroll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL,
	"proratable" boolean DEFAULT false NOT NULL,
	"notes" text,
	"payroll_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_sequences" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"amount_paid" numeric(15, 2) NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_advance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_number" text,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"total_paid" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"tenure_months" integer NOT NULL,
	"preferred_monthly_payment" numeric(15, 2) DEFAULT '0.00',
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_advance_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"action_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deduction_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"system_defined" boolean DEFAULT true NOT NULL,
	"requires_membership" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"deduction_type_id" uuid NOT NULL,
	"rate_type" "rate_type" NOT NULL,
	"rate_value" numeric(10, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filing_voluntary_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"employee_name" varchar(255) NOT NULL,
	"deduction_name" varchar(255) NOT NULL,
	"payroll_id" uuid NOT NULL,
	"payroll_month" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" date DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_group_allowances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pay_group_id" uuid NOT NULL,
	"allowance_type" text NOT NULL,
	"value_type" text DEFAULT 'percentage' NOT NULL,
	"percentage" numeric(5, 2) DEFAULT '0.00',
	"fixed_amount" bigint DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pay_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"apply_paye" boolean DEFAULT false,
	"apply_pension" boolean DEFAULT false,
	"apply_nhf" boolean DEFAULT false,
	"pay_schedule_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "pay_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"pay_frequency" text DEFAULT 'monthly' NOT NULL,
	"pay_schedule" jsonb,
	"weekend_adjustment" text DEFAULT 'none' NOT NULL,
	"holiday_adjustment" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "payroll_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"payroll_date" date NOT NULL,
	"amount" bigint NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"taxable" boolean DEFAULT true,
	"proratable" boolean DEFAULT false,
	"recurring" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"notes" text,
	"created_by" uuid,
	"created_at" date DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_allowances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"allowance_type" text NOT NULL,
	"allowance_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"bonus_type" text NOT NULL,
	"effective_date" date NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text NOT NULL,
	"effective_date" text NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"payroll_date" date NOT NULL,
	"force_include" boolean DEFAULT false,
	"notes" text,
	"created_at" date DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" uuid,
	"basic" numeric(15, 2) NOT NULL,
	"housing" numeric(15, 2) NOT NULL,
	"transport" numeric(15, 2) NOT NULL,
	"gross_salary" numeric(15, 2) NOT NULL,
	"pension_contribution" numeric(15, 2) NOT NULL,
	"employer_pension_contribution" numeric(15, 2) NOT NULL,
	"bonuses" numeric(15, 2) DEFAULT '0.00',
	"reimbursements" jsonb DEFAULT '[]',
	"salary_advance" numeric(15, 2) DEFAULT '0.00',
	"nhf_contribution" numeric(15, 2) DEFAULT '0.00',
	"paye_tax" numeric(15, 2) NOT NULL,
	"custom_deductions" numeric(15, 2) DEFAULT '0.00',
	"voluntary_deductions" jsonb DEFAULT '{"total":"0.00","breakdown":[]}'::jsonb NOT NULL,
	"total_deductions" numeric(15, 2) NOT NULL,
	"net_salary" numeric(15, 2) NOT NULL,
	"taxable_income" numeric(15, 2) NOT NULL,
	"payroll_date" date NOT NULL,
	"payroll_month" text NOT NULL,
	"payment_status" text DEFAULT 'pending',
	"payment_date" date,
	"payment_reference" text DEFAULT '',
	"approval_date" date,
	"approval_remarks" text DEFAULT '',
	"is_starter" boolean DEFAULT true,
	"is_leaver" boolean DEFAULT false,
	"is_off_cycle" boolean DEFAULT false,
	"requested_by" uuid NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"approval_status" text DEFAULT 'pending' NOT NULL,
	"last_approval_at" timestamp,
	"last_approved_by" uuid,
	"workflow_id" uuid NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_ytd" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"payroll_month" text NOT NULL,
	"payroll_date" text NOT NULL,
	"year" integer NOT NULL,
	"gross_salary" numeric(15, 2) NOT NULL,
	"basic_salary" numeric(15, 2) NOT NULL,
	"housing_allowance" numeric(15, 2) NOT NULL,
	"transport_allowance" numeric(15, 2) NOT NULL,
	"total_deductions" numeric(15, 2) NOT NULL,
	"bonuses" numeric(15, 2) DEFAULT '0.00',
	"net_salary" numeric(15, 2) NOT NULL,
	"paye" numeric(15, 2) NOT NULL,
	"pension" numeric(15, 2) NOT NULL,
	"employer_pension" numeric(15, 2) NOT NULL,
	"nhf" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issued_at" date DEFAULT now(),
	"payroll_month" text NOT NULL,
	"slip_status" text DEFAULT 'issued',
	"employer_remarks" text DEFAULT '',
	"pdf_url" text DEFAULT '',
	"payroll_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_filing_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_filing_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"basic_salary" numeric(10, 2) NOT NULL,
	"contribution_amount" numeric(10, 2) NOT NULL,
	"taxable_amount" numeric(10, 2) NOT NULL,
	"tin" text,
	"pension_pin" text,
	"nhf_number" text,
	"reference_number" text,
	"employer_contribution" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"tax_type" text NOT NULL,
	"payroll_month" text NOT NULL,
	"company_tin" text NOT NULL,
	"reference_number" text,
	"status" text DEFAULT 'pending',
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_field_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status",
	"changed_at" timestamp with time zone DEFAULT now(),
	"changed_by" uuid,
	"notes" text
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
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"source" "application_source" DEFAULT 'career_page' NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now(),
	"current_stage" uuid,
	"resume_score" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"source" "candidate_source" DEFAULT 'career_page' NOT NULL,
	"resume_url" varchar(500),
	"profile" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidate_skills" (
	"candidate_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"is_global" boolean DEFAULT false,
	"company_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interview_interviewers" (
	"interview_id" uuid NOT NULL,
	"interviewer_id" uuid NOT NULL,
	"scorecard_template_id" uuid
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage" "interview_stage" NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"duration_mins" integer NOT NULL,
	"meeting_link" varchar(512),
	"event_id" varchar(128),
	"email_template_id" uuid,
	"status" varchar(20) DEFAULT 'scheduled',
	"mode" varchar(20),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scorecard_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" varchar(255),
	"max_score" integer DEFAULT 5 NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scorecard_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_system" boolean DEFAULT false,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"is_global" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "application_form_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"style" "application_style" NOT NULL,
	"include_references" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "application_form_configs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "application_form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"section" varchar(50) NOT NULL,
	"is_visible" boolean DEFAULT true,
	"is_editable" boolean DEFAULT true,
	"label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"required" boolean DEFAULT true,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_form_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"question" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"required" boolean DEFAULT true,
	"order" integer NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"external_job_id" varchar(100),
	"title" varchar(255) NOT NULL,
	"country" varchar(100),
	"state" varchar(100),
	"city" varchar(100),
	"job_type" "job_type" NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"responsibilities" text[],
	"requirements" text[],
	"experience_level" varchar(50),
	"years_of_experience" varchar(50),
	"education_level" varchar(50),
	"salary_range_from" integer,
	"salary_range_to" integer,
	"benefits" text[],
	"currency" varchar(10) DEFAULT 'NGN' NOT NULL,
	"description" text,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"posted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"deadline_date" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "job_postings_external_job_id_unique" UNIQUE("external_job_id")
);
--> statement-breakpoint
CREATE TABLE "generated_offer_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"offer_id" uuid,
	"template_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offer_letter_template_variable_links" (
	"template_id" uuid NOT NULL,
	"variable_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_letter_template_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT true,
	"company_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offer_letter_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_system_template" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"cloned_from_template_id" uuid
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "offer_status" DEFAULT 'pending' NOT NULL,
	"signing_method" varchar(20) DEFAULT 'pdf' NOT NULL,
	"salary" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'NGN' NOT NULL,
	"start_date" date,
	"expires_at" timestamp with time zone,
	"letter_url" varchar(500),
	"signed_letter_url" varchar(500),
	"signing_envelope_id" varchar(255),
	"signing_url" varchar(500),
	"signed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_by" uuid,
	"version" integer DEFAULT 1,
	"pdf_data" json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now(),
	"moved_by" uuid,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_stage_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_template_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_global" boolean DEFAULT false,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_type" varchar(50) NOT NULL,
	"parent_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"name" varchar(255),
	"mime_type" varchar(100),
	"uploaded_by" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_record_id" uuid NOT NULL,
	"adjusted_clock_in" timestamp,
	"adjusted_clock_out" timestamp,
	"reason" text,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"clock_in" timestamp NOT NULL,
	"clock_out" timestamp,
	"work_duration_minutes" integer,
	"overtime_minutes" integer DEFAULT 0,
	"is_late_arrival" boolean DEFAULT false,
	"is_early_departure" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_id" uuid,
	"shift_date" date NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"company_location" uuid,
	"name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"working_days" jsonb NOT NULL,
	"late_tolerance_minutes" integer DEFAULT 10,
	"allow_early_clock_in" boolean DEFAULT false,
	"early_clock_in_minutes" integer DEFAULT 0,
	"allow_late_clock_out" boolean DEFAULT false,
	"late_clock_out_minutes" integer DEFAULT 0,
	"notes" varchar(255),
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"min_approvals" integer DEFAULT 1 NOT NULL,
	"max_approvals" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "company_settings_company_id_key_unique" UNIQUE("company_id","key")
);
--> statement-breakpoint
ALTER TABLE "announcement_categories" ADD CONSTRAINT "announcement_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_reactions" ADD CONSTRAINT "announcement_reactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_location_id_company_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."company_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_category_id_announcement_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."announcement_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_announcement_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."announcement_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_approvals" ADD CONSTRAINT "asset_approvals_asset_id_asset_requests_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_approvals" ADD CONSTRAINT "asset_approvals_step_id_approval_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."approval_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_approvals" ADD CONSTRAINT "asset_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reports" ADD CONSTRAINT "asset_reports_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reports" ADD CONSTRAINT "asset_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_reports" ADD CONSTRAINT "asset_reports_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_company_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."company_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_company_role_id_company_roles_id_fk" FOREIGN KEY ("company_role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_role_permissions" ADD CONSTRAINT "company_role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_role_id_company_roles_id_fk" FOREIGN KEY ("company_role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificationToken" ADD CONSTRAINT "verificationToken_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_benefit_plan_id_benefit_plans_id_fk" FOREIGN KEY ("benefit_plan_id") REFERENCES "public"."benefit_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_enrollments" ADD CONSTRAINT "benefit_enrollments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_groups" ADD CONSTRAINT "benefit_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_plans" ADD CONSTRAINT "benefit_plans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_plans" ADD CONSTRAINT "benefit_plans_benefit_group_id_benefit_groups_id_fk" FOREIGN KEY ("benefit_group_id") REFERENCES "public"."benefit_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_departments" ADD CONSTRAINT "company_file_folder_departments_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_departments" ADD CONSTRAINT "company_file_folder_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_offices" ADD CONSTRAINT "company_file_folder_offices_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_offices" ADD CONSTRAINT "company_file_folder_offices_office_id_company_locations_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."company_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_roles" ADD CONSTRAINT "company_file_folder_roles_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folder_roles" ADD CONSTRAINT "company_file_folder_roles_role_id_company_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."company_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folders" ADD CONSTRAINT "company_file_folders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_file_folders" ADD CONSTRAINT "company_file_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_folder_id_company_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."company_file_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_locations" ADD CONSTRAINT "company_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_tax_details" ADD CONSTRAINT "company_tax_details_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_managers" ADD CONSTRAINT "location_managers_location_id_company_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."company_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_managers" ADD CONSTRAINT "location_managers_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_id_employees_id_fk" FOREIGN KEY ("head_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_departments_id_fk" FOREIGN KEY ("parent_department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_compensations" ADD CONSTRAINT "employee_compensations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_dependents" ADD CONSTRAINT "employee_dependents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_sequences" ADD CONSTRAINT "employee_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_role_id_job_roles_id_fk" FOREIGN KEY ("job_role_id") REFERENCES "public"."job_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_location_company_locations_id_fk" FOREIGN KEY ("company_location") REFERENCES "public"."company_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_pay_group_id_pay_groups_id_fk" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_financials" ADD CONSTRAINT "employee_financials_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD CONSTRAINT "employee_group_memberships_group_id_employee_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."employee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_group_memberships" ADD CONSTRAINT "employee_group_memberships_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_groups" ADD CONSTRAINT "employee_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_history" ADD CONSTRAINT "employee_history_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_step_id_approval_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."approval_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_leave_days" ADD CONSTRAINT "blocked_leave_days_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_leave_days" ADD CONSTRAINT "blocked_leave_days_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_leave_days" ADD CONSTRAINT "reserved_leave_days_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_leave_days" ADD CONSTRAINT "reserved_leave_days_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_leave_days" ADD CONSTRAINT "reserved_leave_days_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reserved_leave_days" ADD CONSTRAINT "reserved_leave_days_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding" ADD CONSTRAINT "employee_onboarding_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding" ADD CONSTRAINT "employee_onboarding_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_onboarding" ADD CONSTRAINT "employee_onboarding_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_template_checklists" ADD CONSTRAINT "onboarding_template_checklists_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_template_fields" ADD CONSTRAINT "onboarding_template_fields_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_lifecycle_tokens" ADD CONSTRAINT "employee_lifecycle_tokens_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "off_cycle_payroll" ADD CONSTRAINT "off_cycle_payroll_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "off_cycle_payroll" ADD CONSTRAINT "off_cycle_payroll_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_sequences" ADD CONSTRAINT "loan_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_loan_id_salary_advance_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."salary_advance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance" ADD CONSTRAINT "salary_advance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance" ADD CONSTRAINT "salary_advance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_loan_id_salary_advance_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."salary_advance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_action_by_users_id_fk" FOREIGN KEY ("action_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_deductions" ADD CONSTRAINT "employee_deductions_deduction_type_id_deduction_types_id_fk" FOREIGN KEY ("deduction_type_id") REFERENCES "public"."deduction_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_voluntary_deductions" ADD CONSTRAINT "filing_voluntary_deductions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filing_voluntary_deductions" ADD CONSTRAINT "filing_voluntary_deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_group_allowances" ADD CONSTRAINT "pay_group_allowances_pay_group_id_pay_groups_id_fk" FOREIGN KEY ("pay_group_id") REFERENCES "public"."pay_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_groups" ADD CONSTRAINT "pay_groups_pay_schedule_id_pay_schedules_id_fk" FOREIGN KEY ("pay_schedule_id") REFERENCES "public"."pay_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_groups" ADD CONSTRAINT "pay_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_schedules" ADD CONSTRAINT "pay_schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_allowances" ADD CONSTRAINT "payroll_allowances_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_bonuses" ADD CONSTRAINT "payroll_bonuses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_bonuses" ADD CONSTRAINT "payroll_bonuses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_bonuses" ADD CONSTRAINT "payroll_bonuses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_deductions" ADD CONSTRAINT "payroll_deductions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_overrides" ADD CONSTRAINT "payroll_overrides_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_overrides" ADD CONSTRAINT "payroll_overrides_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_last_approved_by_users_id_fk" FOREIGN KEY ("last_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_approvals" ADD CONSTRAINT "payroll_approvals_step_id_approval_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."approval_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_approvals" ADD CONSTRAINT "payroll_approvals_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_ytd" ADD CONSTRAINT "payroll_ytd_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_ytd" ADD CONSTRAINT "payroll_ytd_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_ytd" ADD CONSTRAINT "payroll_ytd_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_details" ADD CONSTRAINT "tax_filing_details_tax_filing_id_tax_filings_id_fk" FOREIGN KEY ("tax_filing_id") REFERENCES "public"."tax_filings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_details" ADD CONSTRAINT "tax_filing_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_field_responses" ADD CONSTRAINT "application_field_responses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_history" ADD CONSTRAINT "application_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_question_responses" ADD CONSTRAINT "application_question_responses_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_current_stage_pipeline_stages_id_fk" FOREIGN KEY ("current_stage") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_email_templates" ADD CONSTRAINT "interview_email_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_criterion_id_scorecard_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."scorecard_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_scores" ADD CONSTRAINT "interview_scores_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_scorecard_template_id_scorecard_templates_id_fk" FOREIGN KEY ("scorecard_template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_email_template_id_interview_email_templates_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."interview_email_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_criteria" ADD CONSTRAINT "scorecard_criteria_template_id_scorecard_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scorecard_templates" ADD CONSTRAINT "scorecard_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_configs" ADD CONSTRAINT "application_form_configs_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_fields" ADD CONSTRAINT "application_form_fields_form_id_application_form_configs_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_form_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_questions" ADD CONSTRAINT "application_form_questions_form_id_application_form_configs_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_form_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_form_questions" ADD CONSTRAINT "application_form_questions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_offer_letters" ADD CONSTRAINT "generated_offer_letters_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_offer_letters" ADD CONSTRAINT "generated_offer_letters_template_id_offer_letter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_letter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_template_variable_links" ADD CONSTRAINT "offer_letter_template_variable_links_template_id_offer_letter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_letter_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_template_variable_links" ADD CONSTRAINT "offer_letter_template_variable_links_variable_id_offer_letter_template_variables_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."offer_letter_template_variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_template_variables" ADD CONSTRAINT "offer_letter_template_variables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_templates" ADD CONSTRAINT "offer_letter_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_template_id_offer_letter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_letter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_history" ADD CONSTRAINT "pipeline_history_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" ADD CONSTRAINT "pipeline_stage_instances_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stage_instances" ADD CONSTRAINT "pipeline_stage_instances_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_template_stages" ADD CONSTRAINT "pipeline_template_stages_template_id_pipeline_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pipeline_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_templates" ADD CONSTRAINT "pipeline_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_employees_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustments" ADD CONSTRAINT "attendance_adjustments_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_company_location_company_locations_id_fk" FOREIGN KEY ("company_location") REFERENCES "public"."company_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_categories_company_id_idx" ON "announcement_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "announcement_categories_id_idx" ON "announcement_categories" USING btree ("id");--> statement-breakpoint
CREATE INDEX "announcement_comments_announcement_id_idx" ON "announcement_comments" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_comments_created_by_idx" ON "announcement_comments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "announcement_comments_created_at_idx" ON "announcement_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "announcement_reactions_announcement_id_idx" ON "announcement_reactions" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_reactions_created_by_idx" ON "announcement_reactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "announcement_reactions_reaction_type_idx" ON "announcement_reactions" USING btree ("reaction_type");--> statement-breakpoint
CREATE INDEX "announcements_company_id_idx" ON "announcements" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "announcements_category_id_idx" ON "announcements" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "announcements_department_id_idx" ON "announcements" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "announcements_location_id_idx" ON "announcements" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "announcements_published_at_idx" ON "announcements" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "announcements_is_published_idx" ON "announcements" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "announcements_created_by_idx" ON "announcements" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "comment_reactions_comment_id_idx" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_reactions_created_by_idx" ON "comment_reactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "comment_reactions_reaction_type_idx" ON "comment_reactions" USING btree ("reaction_type");--> statement-breakpoint
CREATE INDEX "asset_approvals_asset_request_id_idx" ON "asset_approvals" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_approvals_step_id_idx" ON "asset_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "asset_approvals_actor_id_idx" ON "asset_approvals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "asset_approvals_action_idx" ON "asset_approvals" USING btree ("action");--> statement-breakpoint
CREATE INDEX "asset_reports_employee_id_idx" ON "asset_reports" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "asset_reports_company_id_idx" ON "asset_reports" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "asset_reports_asset_id_idx" ON "asset_reports" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_reports_report_type_idx" ON "asset_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "asset_reports_status_idx" ON "asset_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_reports_reported_at_idx" ON "asset_reports" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX "asset_requests_employee_id_idx" ON "asset_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "asset_requests_company_id_idx" ON "asset_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "asset_requests_status_idx" ON "asset_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "asset_requests_request_date_idx" ON "asset_requests" USING btree ("request_date");--> statement-breakpoint
CREATE INDEX "asset_requests_asset_type_idx" ON "asset_requests" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "asset_requests_urgency_idx" ON "asset_requests" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "assets_internal_id_idx" ON "assets" USING btree ("internal_id");--> statement-breakpoint
CREATE INDEX "assets_company_id_idx" ON "assets" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "assets_location_id_idx" ON "assets" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "assets_employee_id_idx" ON "assets" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "assets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assets_purchase_date_idx" ON "assets" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_company_role_permissions" ON "company_role_permissions" USING btree ("company_role_id");--> statement-breakpoint
CREATE INDEX "idx_permission_id" ON "company_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_role_permission_unique" ON "company_role_permissions" USING btree ("company_role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_permission" ON "company_roles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_role_unique" ON "company_roles" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "idx_user_id_password_reset" ON "PasswordResetToken" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_company_id" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_role_id" ON "users" USING btree ("company_role_id");--> statement-breakpoint
CREATE INDEX "idx_user_id_verification" ON "verificationToken" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "benefit_enrollments_benefit_plan_id_idx" ON "benefit_enrollments" USING btree ("benefit_plan_id");--> statement-breakpoint
CREATE INDEX "benefit_enrollments_employee_id_idx" ON "benefit_enrollments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "benefit_enrollments_enrolled_at_idx" ON "benefit_enrollments" USING btree ("enrolled_at");--> statement-breakpoint
CREATE INDEX "benefit_groups_company_id_idx" ON "benefit_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "benefit_groups_name_idx" ON "benefit_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "benefit_groups_created_at_idx" ON "benefit_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "benefit_plans_company_id_idx" ON "benefit_plans" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "benefit_plans_benefit_group_id_idx" ON "benefit_plans" USING btree ("benefit_group_id");--> statement-breakpoint
CREATE INDEX "benefit_plans_name_idx" ON "benefit_plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "benefit_plans_category_idx" ON "benefit_plans" USING btree ("category");--> statement-breakpoint
CREATE INDEX "benefit_plans_start_date_idx" ON "benefit_plans" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "benefit_plans_end_date_idx" ON "benefit_plans" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "benefit_plans_created_at_idx" ON "benefit_plans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_company_locations_companyId" ON "company_locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_tax_details" ON "company_tax_details" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_tin_tax_details" ON "company_tax_details" USING btree ("tin");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_companies_domain" ON "companies" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_companies_country" ON "companies" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_cost_centers_company_code" ON "cost_centers" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "idx_cost_centers_company" ON "cost_centers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_departments_company_name" ON "departments" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "idx_departments_company" ON "departments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "employee_certifications_employee_id_idx" ON "employee_certifications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_certifications_name_idx" ON "employee_certifications" USING btree ("name");--> statement-breakpoint
CREATE INDEX "employee_certifications_issue_date_idx" ON "employee_certifications" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX "employee_certifications_expiry_date_idx" ON "employee_certifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "employee_certifications_created_at_idx" ON "employee_certifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employee_compensations_employee_id_idx" ON "employee_compensations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_compensations_effective_date_idx" ON "employee_compensations" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "employee_compensations_created_at_idx" ON "employee_compensations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employee_dependents_employee_id_idx" ON "employee_dependents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_dependents_name_idx" ON "employee_dependents" USING btree ("name");--> statement-breakpoint
CREATE INDEX "employee_dependents_relationship_idx" ON "employee_dependents" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX "employee_dependents_date_of_birth_idx" ON "employee_dependents" USING btree ("date_of_birth");--> statement-breakpoint
CREATE INDEX "employee_dependents_is_beneficiary_idx" ON "employee_dependents" USING btree ("is_beneficiary");--> statement-breakpoint
CREATE INDEX "employee_dependents_created_at_idx" ON "employee_dependents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_employee_documents_employee" ON "employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_sequences_next_number_idx" ON "employee_sequences" USING btree ("next_number");--> statement-breakpoint
CREATE INDEX "employees_company_id_idx" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employees_department_id_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_job_role_id_idx" ON "employees" USING btree ("job_role_id");--> statement-breakpoint
CREATE INDEX "employees_manager_id_idx" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "employees_cost_center_id_idx" ON "employees" USING btree ("cost_center_id");--> statement-breakpoint
CREATE INDEX "employees_location_id_idx" ON "employees" USING btree ("company_location");--> statement-breakpoint
CREATE INDEX "employees_pay_group_id_idx" ON "employees" USING btree ("pay_group_id");--> statement-breakpoint
CREATE INDEX "employees_employment_status_idx" ON "employees" USING btree ("employment_status");--> statement-breakpoint
CREATE INDEX "employees_employment_start_date_idx" ON "employees" USING btree ("employment_start_date");--> statement-breakpoint
CREATE INDEX "employees_probation_end_date_idx" ON "employees" USING btree ("probation_end_date");--> statement-breakpoint
CREATE INDEX "employees_first_name_idx" ON "employees" USING btree ("first_name");--> statement-breakpoint
CREATE INDEX "employees_last_name_idx" ON "employees" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "employees_created_at_idx" ON "employees" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employees_updated_at_idx" ON "employees" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "employee_financials_bank_name_idx" ON "employee_financials" USING btree ("bank_name");--> statement-breakpoint
CREATE INDEX "employee_financials_currency_idx" ON "employee_financials" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "employee_financials_created_at_idx" ON "employee_financials" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_employee_group_memberships" ON "employee_group_memberships" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_history_employee_id_idx" ON "employee_history" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_history_type_idx" ON "employee_history" USING btree ("type");--> statement-breakpoint
CREATE INDEX "employee_history_start_date_idx" ON "employee_history" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "employee_history_end_date_idx" ON "employee_history" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "employee_history_created_at_idx" ON "employee_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employee_profiles_employee_id_idx" ON "employee_profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_profiles_date_of_birth_idx" ON "employee_profiles" USING btree ("date_of_birth");--> statement-breakpoint
CREATE INDEX "employee_profiles_gender_idx" ON "employee_profiles" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "employee_profiles_marital_status_idx" ON "employee_profiles" USING btree ("marital_status");--> statement-breakpoint
CREATE INDEX "employee_profiles_state_idx" ON "employee_profiles" USING btree ("state");--> statement-breakpoint
CREATE INDEX "employee_profiles_country_idx" ON "employee_profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX "employee_profiles_created_at_idx" ON "employee_profiles" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_job_roles_company_title" ON "job_roles" USING btree ("company_id","title");--> statement-breakpoint
CREATE INDEX "idx_job_roles_company" ON "job_roles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "expense_approvals_expense_id_idx" ON "expense_approvals" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_approvals_step_id_idx" ON "expense_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "expense_approvals_actor_id_idx" ON "expense_approvals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "expense_approvals_action_idx" ON "expense_approvals" USING btree ("action");--> statement-breakpoint
CREATE INDEX "expense_approvals_created_at_idx" ON "expense_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expenses_company_id_idx" ON "expenses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "expenses_employee_id_idx" ON "expenses" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_status_idx" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expenses_submitted_at_idx" ON "expenses" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "expenses_created_at_idx" ON "expenses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "holidays_company_id_idx" ON "holidays" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "holidays_date_idx" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX "holidays_name_idx" ON "holidays" USING btree ("name");--> statement-breakpoint
CREATE INDEX "holidays_year_idx" ON "holidays" USING btree ("year");--> statement-breakpoint
CREATE INDEX "holidays_type_idx" ON "holidays" USING btree ("type");--> statement-breakpoint
CREATE INDEX "holidays_country_idx" ON "holidays" USING btree ("country");--> statement-breakpoint
CREATE INDEX "holidays_source_idx" ON "holidays" USING btree ("source");--> statement-breakpoint
CREATE INDEX "leave_balances_company_id_idx" ON "leave_balances" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "leave_balances_employee_id_idx" ON "leave_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "leave_balances_leave_type_id_idx" ON "leave_balances" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX "leave_balances_year_idx" ON "leave_balances" USING btree ("year");--> statement-breakpoint
CREATE INDEX "leave_policies_company_id_idx" ON "leave_policies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "leave_policies_leave_type_id_idx" ON "leave_policies" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX "leave_policies_accrual_enabled_idx" ON "leave_policies" USING btree ("accrual_enabled");--> statement-breakpoint
CREATE INDEX "leave_policies_accrual_frequency_idx" ON "leave_policies" USING btree ("accrual_frequency");--> statement-breakpoint
CREATE INDEX "leave_policies_gender_eligibility_idx" ON "leave_policies" USING btree ("gender_eligibility");--> statement-breakpoint
CREATE INDEX "leave_policies_created_at_idx" ON "leave_policies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leave_requests_company_id_idx" ON "leave_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "leave_requests_leave_type_id_idx" ON "leave_requests" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_requests_requested_at_idx" ON "leave_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "leave_requests_approved_at_idx" ON "leave_requests" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX "leave_requests_start_date_idx" ON "leave_requests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "leave_requests_end_date_idx" ON "leave_requests" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "leave_types_name_idx" ON "leave_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "leave_types_is_paid_idx" ON "leave_types" USING btree ("is_paid");--> statement-breakpoint
CREATE INDEX "leave_types_company_id_idx" ON "leave_types" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "leave_types_created_at_idx" ON "leave_types" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employee_onboarding_employee_id_idx" ON "employee_onboarding" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_template_id_idx" ON "employee_onboarding" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "employee_onboarding_status_idx" ON "employee_onboarding" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employee_onboarding_company_id_idx" ON "employee_onboarding" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "employee_checklist_status_employee_id_idx" ON "employee_checklist_status" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "onboarding_template_checklists_template_id_idx" ON "onboarding_template_checklists" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "onboarding_template_fields_template_id_idx" ON "onboarding_template_fields" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "onboarding_template_fields_field_key_idx" ON "onboarding_template_fields" USING btree ("field_key");--> statement-breakpoint
CREATE INDEX "onboarding_template_fields_tag_idx" ON "onboarding_template_fields" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "onboarding_templates_name_idx" ON "onboarding_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "lifecycle_tokens_employee_id_idx" ON "employee_lifecycle_tokens" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "lifecycle_tokens_type_idx" ON "employee_lifecycle_tokens" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_company_id_idx" ON "notification" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "notifications_employee_id_idx" ON "notification" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notification" USING btree ("read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_employee_id_off_cycle" ON "off_cycle_payroll" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_off_cycle" ON "off_cycle_payroll" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_date_off_cycle" ON "off_cycle_payroll" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX "loan_sequences_next_number_idx" ON "loan_sequences" USING btree ("next_number");--> statement-breakpoint
CREATE INDEX "idx_loan_id_repayments" ON "repayments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_paid_at_repayments" ON "repayments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "idx_company_id_loans" ON "salary_advance" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_loans" ON "salary_advance" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_status_loans" ON "salary_advance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_company_id_loan_history" ON "salary_advance_history" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_loan_id_loan_history" ON "salary_advance_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_action_loan_history" ON "salary_advance_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_created_at_loan_history" ON "salary_advance_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deduction_types_name_idx" ON "deduction_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "deduction_types_code_idx" ON "deduction_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "employee_deductions_employee_id_idx" ON "employee_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_deductions_deduction_type_id_idx" ON "employee_deductions" USING btree ("deduction_type_id");--> statement-breakpoint
CREATE INDEX "employee_deductions_rate_type_idx" ON "employee_deductions" USING btree ("rate_type");--> statement-breakpoint
CREATE INDEX "employee_deductions_start_date_idx" ON "employee_deductions" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "employee_deductions_is_active_idx" ON "employee_deductions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "filing_voluntary_deductions_company_id_idx" ON "filing_voluntary_deductions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "filing_voluntary_deductions_employee_id_idx" ON "filing_voluntary_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "filing_voluntary_deductions_payroll_id_idx" ON "filing_voluntary_deductions" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX "filing_voluntary_deductions_payroll_month_idx" ON "filing_voluntary_deductions" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX "filing_voluntary_deductions_status_idx" ON "filing_voluntary_deductions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "filing_voluntary_deductions_created_at_idx" ON "filing_voluntary_deductions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pay_group_allowances_pay_group_id_idx" ON "pay_group_allowances" USING btree ("pay_group_id");--> statement-breakpoint
CREATE INDEX "pay_group_allowances_allowance_type_idx" ON "pay_group_allowances" USING btree ("allowance_type");--> statement-breakpoint
CREATE INDEX "pay_group_allowances_value_type_idx" ON "pay_group_allowances" USING btree ("value_type");--> statement-breakpoint
CREATE INDEX "pay_group_allowances_created_at_idx" ON "pay_group_allowances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pay_groups_name_idx" ON "pay_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pay_groups_pay_schedule_id_idx" ON "pay_groups" USING btree ("pay_schedule_id");--> statement-breakpoint
CREATE INDEX "pay_groups_company_id_idx" ON "pay_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pay_groups_created_at_idx" ON "pay_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pay_groups_is_deleted_idx" ON "pay_groups" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "pay_schedules_company_id_idx" ON "pay_schedules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "pay_schedules_start_date_idx" ON "pay_schedules" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "pay_schedules_pay_frequency_idx" ON "pay_schedules" USING btree ("pay_frequency");--> statement-breakpoint
CREATE INDEX "pay_schedules_is_deleted_idx" ON "pay_schedules" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "pay_schedules_created_at_idx" ON "pay_schedules" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_company_id_idx" ON "payroll_adjustments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_employee_id_idx" ON "payroll_adjustments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_payroll_date_idx" ON "payroll_adjustments" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_type_idx" ON "payroll_adjustments" USING btree ("type");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_is_deleted_idx" ON "payroll_adjustments" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_created_by_idx" ON "payroll_adjustments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "payroll_adjustments_created_at_idx" ON "payroll_adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_allowances_payroll_id_idx" ON "payroll_allowances" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "payroll_allowances_employee_id_idx" ON "payroll_allowances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_allowances_allowance_type_idx" ON "payroll_allowances" USING btree ("allowance_type");--> statement-breakpoint
CREATE INDEX "payroll_allowances_created_at_idx" ON "payroll_allowances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_bonuses_company_id_idx" ON "payroll_bonuses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payroll_bonuses_employee_id_idx" ON "payroll_bonuses" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_bonuses_created_by_idx" ON "payroll_bonuses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "payroll_bonuses_effective_date_idx" ON "payroll_bonuses" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "payroll_bonuses_status_idx" ON "payroll_bonuses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payroll_bonuses_created_at_idx" ON "payroll_bonuses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_deductions_company_id_idx" ON "payroll_deductions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payroll_deductions_employee_id_idx" ON "payroll_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_deductions_created_by_idx" ON "payroll_deductions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "payroll_deductions_effective_date_idx" ON "payroll_deductions" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX "payroll_deductions_status_idx" ON "payroll_deductions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payroll_deductions_created_at_idx" ON "payroll_deductions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_overrides_employee_id_idx" ON "payroll_overrides" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_overrides_company_id_idx" ON "payroll_overrides" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payroll_overrides_payroll_date_idx" ON "payroll_overrides" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX "payroll_overrides_force_include_idx" ON "payroll_overrides" USING btree ("force_include");--> statement-breakpoint
CREATE INDEX "payroll_overrides_created_at_idx" ON "payroll_overrides" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_payroll_run_id_idx" ON "payroll" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "payroll_employee_id_idx" ON "payroll" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payroll_company_id_idx" ON "payroll" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payroll_user_id_idx" ON "payroll" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payroll_payroll_date_idx" ON "payroll" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX "payroll_payroll_month_idx" ON "payroll" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX "payroll_payment_status_idx" ON "payroll" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "payroll_requested_by_idx" ON "payroll" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "payroll_requested_at_idx" ON "payroll" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "payroll_approval_status_idx" ON "payroll" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "payroll_last_approved_by_idx" ON "payroll" USING btree ("last_approved_by");--> statement-breakpoint
CREATE INDEX "payroll_workflow_id_idx" ON "payroll" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "payroll_current_step_idx" ON "payroll" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "payroll_created_at_idx" ON "payroll" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payroll_approvals_payroll_run_id_idx" ON "payroll_approvals" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "payroll_approvals_step_id_idx" ON "payroll_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "payroll_approvals_actor_id_idx" ON "payroll_approvals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "payroll_approvals_created_at_idx" ON "payroll_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_payroll_run_id_ytd_payroll" ON "payroll_ytd" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_ytd_payroll" ON "payroll_ytd" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_month_ytd_payroll" ON "payroll_ytd" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX "idx_year_ytd_payroll" ON "payroll_ytd" USING btree ("year");--> statement-breakpoint
CREATE INDEX "payslips_payroll_id_idx" ON "payslips" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX "payslips_employee_id_idx" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payslips_company_id_idx" ON "payslips" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "payslips_payroll_month_idx" ON "payslips" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX "payslips_slip_status_idx" ON "payslips" USING btree ("slip_status");--> statement-breakpoint
CREATE INDEX "payslips_issued_at_idx" ON "payslips" USING btree ("issued_at");--> statement-breakpoint
CREATE INDEX "idx_tax_filing_id_tax_filing_details" ON "tax_filing_details" USING btree ("tax_filing_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_tax_filing_details" ON "tax_filing_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_tin_tax_filing_details" ON "tax_filing_details" USING btree ("tin");--> statement-breakpoint
CREATE INDEX "idx_company_id_tax_filings" ON "tax_filings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_tax_type_tax_filings" ON "tax_filings" USING btree ("tax_type");--> statement-breakpoint
CREATE INDEX "idx_company_tin_tax_filings" ON "tax_filings" USING btree ("company_tin");--> statement-breakpoint
CREATE INDEX "idx_status_tax_filings" ON "tax_filings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_apphist_app" ON "application_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_app_job" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_app_cand" ON "applications" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_app_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_cand_email" ON "candidates" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_cand_source" ON "candidates" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_candskill_cand" ON "candidate_skills" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_ii_interview" ON "interview_interviewers" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "idx_ii_interviewer" ON "interview_interviewers" USING btree ("interviewer_id");--> statement-breakpoint
CREATE INDEX "idx_int_app" ON "interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_scorecard_company" ON "scorecard_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_job_company" ON "job_postings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_job_status" ON "job_postings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_posted_at" ON "job_postings" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_offer_id" ON "generated_offer_letters" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_candidate_id" ON "generated_offer_letters" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_template_id" ON "generated_offer_letters" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_status" ON "generated_offer_letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "template_variable_link_idx" ON "offer_letter_template_variable_links" USING btree ("template_id","variable_id");--> statement-breakpoint
CREATE INDEX "template_variable_name_idx" ON "offer_letter_template_variables" USING btree ("name");--> statement-breakpoint
CREATE INDEX "template_variable_company_idx" ON "offer_letter_template_variables" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_off_app" ON "offers" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_off_status" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_off_signing_method" ON "offers" USING btree ("signing_method");--> statement-breakpoint
CREATE INDEX "idx_pipehist_app" ON "pipeline_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_pipehist_stage" ON "pipeline_history" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_stage_instance_app" ON "pipeline_stage_instances" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_stage_instance_stage" ON "pipeline_stage_instances" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_stage_job" ON "pipeline_stages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_stage_job_order" ON "pipeline_stages" USING btree ("job_id","order");--> statement-breakpoint
CREATE INDEX "idx_tplstg_template" ON "pipeline_template_stages" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_tplstg_template_order" ON "pipeline_template_stages" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX "idx_att_parent" ON "attachments" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE INDEX "idx_att_upload" ON "attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "attendance_adjustments_record_id_idx" ON "attendance_adjustments" USING btree ("attendance_record_id");--> statement-breakpoint
CREATE INDEX "attendance_adjustments_approved_by_idx" ON "attendance_adjustments" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "attendance_adjustments_created_at_idx" ON "attendance_adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attendance_records_company_id_idx" ON "attendance_records" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "attendance_records_employee_id_idx" ON "attendance_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "attendance_records_clock_in_idx" ON "attendance_records" USING btree ("clock_in");--> statement-breakpoint
CREATE INDEX "attendance_records_clock_out_idx" ON "attendance_records" USING btree ("clock_out");--> statement-breakpoint
CREATE INDEX "attendance_records_created_at_idx" ON "attendance_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "employee_shifts_company_id_idx" ON "employee_shifts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "employee_shifts_employee_id_idx" ON "employee_shifts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_shifts_shift_id_idx" ON "employee_shifts" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX "employee_shifts_shift_date_idx" ON "employee_shifts" USING btree ("shift_date");--> statement-breakpoint
CREATE INDEX "employee_shifts_is_deleted_idx" ON "employee_shifts" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "employee_shifts_created_at_idx" ON "employee_shifts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "shifts_company_id_idx" ON "shifts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "shifts_location_id_idx" ON "shifts" USING btree ("company_location");--> statement-breakpoint
CREATE INDEX "shifts_name_idx" ON "shifts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "shifts_is_deleted_idx" ON "shifts" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "shifts_created_at_idx" ON "shifts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_steps_workflow_id_idx" ON "approval_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "approval_steps_sequence_idx" ON "approval_steps" USING btree ("sequence");--> statement-breakpoint
CREATE INDEX "approval_steps_role_idx" ON "approval_steps" USING btree ("role");--> statement-breakpoint
CREATE INDEX "approval_steps_status_idx" ON "approval_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_steps_created_at_idx" ON "approval_steps" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_workflows_name_idx" ON "approval_workflows" USING btree ("name");--> statement-breakpoint
CREATE INDEX "approval_workflows_company_id_idx" ON "approval_workflows" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "approval_workflows_entity_id_idx" ON "approval_workflows" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "approval_workflows_entity_date_idx" ON "approval_workflows" USING btree ("entity_date");--> statement-breakpoint
CREATE INDEX "approval_workflows_created_at_idx" ON "approval_workflows" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_company_settings" ON "company_settings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_settings_key" ON "company_settings" USING btree ("key");