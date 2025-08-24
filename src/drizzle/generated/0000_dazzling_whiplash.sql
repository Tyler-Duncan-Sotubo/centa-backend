
CREATE TABLE IF NOT EXISTS "announcement_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcement_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcement_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
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
CREATE TABLE IF NOT EXISTS "comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"reaction_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_reports" (
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
CREATE TABLE IF NOT EXISTS "asset_requests" (
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
CREATE TABLE IF NOT EXISTS "assets" (
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
CREATE TABLE IF NOT EXISTS "audit_logs" (
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
CREATE TABLE IF NOT EXISTS "company_role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_used" boolean NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
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
CREATE TABLE IF NOT EXISTS "verificationToken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"is_used" boolean NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefit_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benefit_plan_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"selected_coverage" text NOT NULL,
	"enrolled_at" timestamp DEFAULT now(),
	"is_opted_out" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefit_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"team_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefit_plans" (
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
CREATE TABLE IF NOT EXISTS "company_file_folder_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"department_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_file_folder_offices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"office_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_file_folder_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"role_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_file_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"permission_controlled" boolean DEFAULT false,
	"created_by" uuid,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_files" (
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
CREATE TABLE IF NOT EXISTS "company_locations" (
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
CREATE TABLE IF NOT EXISTS "company_tax_details" (
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
CREATE TABLE IF NOT EXISTS "companies" (
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
CREATE TABLE IF NOT EXISTS "location_managers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"budget" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
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
CREATE TABLE IF NOT EXISTS "employee_certifications" (
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
CREATE TABLE IF NOT EXISTS "employee_compensations" (
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
CREATE TABLE IF NOT EXISTS "employee_dependents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"is_beneficiary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_documents" (
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
CREATE TABLE IF NOT EXISTS "employee_sequences" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
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
CREATE TABLE IF NOT EXISTS "employee_financials" (
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
CREATE TABLE IF NOT EXISTS "employee_group_memberships" (
	"group_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"role" "group_member_role" DEFAULT 'member' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"title" varchar(120),
	"start_date" date,
	"end_date" date,
	"allocation_pct" integer,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120),
	"type" "group_type" DEFAULT 'TEAM' NOT NULL,
	"parent_group_id" uuid,
	"location" varchar(100),
	"timezone" varchar(64),
	"headcount_cap" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_history" (
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
CREATE TABLE IF NOT EXISTS "employee_profiles" (
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
CREATE TABLE IF NOT EXISTS "job_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"level" varchar(100),
	"description" text,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expense_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
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
CREATE TABLE IF NOT EXISTS "google_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
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
CREATE TABLE IF NOT EXISTS "blocked_leave_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"reason" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reserved_leave_days" (
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
CREATE TABLE IF NOT EXISTS "holidays" (
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
CREATE TABLE IF NOT EXISTS "leave_balances" (
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
CREATE TABLE IF NOT EXISTS "leave_policies" (
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
CREATE TABLE IF NOT EXISTS "leave_requests" (
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
CREATE TABLE IF NOT EXISTS "leave_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_paid" boolean DEFAULT true,
	"color_tag" varchar(10),
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "termination_checklist_items" (
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
CREATE TABLE IF NOT EXISTS "termination_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false,
	"company_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_termination_checklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"asset_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"is_asset_return_step" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "termination_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"termination_type_id" uuid,
	"termination_reason_id" uuid,
	"termination_date" varchar NOT NULL,
	"eligible_for_rehire" boolean DEFAULT true,
	"notes" text,
	"status" varchar(20) DEFAULT 'in_progress',
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "termination_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_global" boolean DEFAULT false,
	"company_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_onboarding" (
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
CREATE TABLE IF NOT EXISTS "employee_checklist_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"status" "checklist_status" DEFAULT 'pending',
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_template_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"assignee" "checklist_assignee" DEFAULT 'employee',
	"order" integer DEFAULT 0,
	"due_days_after_start" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_template_fields" (
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
CREATE TABLE IF NOT EXISTS "onboarding_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"status" "onboarding_template_status" DEFAULT 'draft',
	"is_global" boolean DEFAULT false,
	"company_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_lifecycle_tokens" (
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
CREATE TABLE IF NOT EXISTS "notification" (
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
CREATE TABLE IF NOT EXISTS "off_cycle_payroll" (
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
CREATE TABLE IF NOT EXISTS "loan_sequences" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repayments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"amount_paid" numeric(15, 2) NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "salary_advance" (
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
CREATE TABLE IF NOT EXISTS "salary_advance_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"loan_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text,
	"action_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deduction_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"system_defined" boolean DEFAULT true NOT NULL,
	"requires_membership" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_deductions" (
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
CREATE TABLE IF NOT EXISTS "filing_voluntary_deductions" (
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
CREATE TABLE IF NOT EXISTS "pay_group_allowances" (
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
CREATE TABLE IF NOT EXISTS "pay_groups" (
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
CREATE TABLE IF NOT EXISTS "pay_schedules" (
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
CREATE TABLE IF NOT EXISTS "payroll_adjustments" (
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
CREATE TABLE IF NOT EXISTS "payroll_allowances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"allowance_type" text NOT NULL,
	"allowance_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_bonuses" (
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
CREATE TABLE IF NOT EXISTS "payroll_deductions" (
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
CREATE TABLE IF NOT EXISTS "payroll_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"payroll_date" date NOT NULL,
	"force_include" boolean DEFAULT false,
	"notes" text,
	"created_at" date DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll" (
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
CREATE TABLE IF NOT EXISTS "payroll_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payroll_ytd" (
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
CREATE TABLE IF NOT EXISTS "payslips" (
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
CREATE TABLE IF NOT EXISTS "tax_filing_details" (
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
CREATE TABLE IF NOT EXISTS "tax_filings" (
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
CREATE TABLE IF NOT EXISTS "performance_appraisal_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"start_date" varchar NOT NULL,
	"end_date" varchar NOT NULL,
	"status" text NOT NULL,
	"is_auto_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_appraisal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appraisal_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"expected_level_id" uuid NOT NULL,
	"employee_level_id" uuid,
	"manager_level_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_appraisals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"cycle_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"submitted_by_employee" boolean DEFAULT false,
	"submitted_by_manager" boolean DEFAULT false,
	"finalized" boolean DEFAULT false,
	"final_score" integer,
	"promotion_recommendation" text,
	"final_note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_assessment_section_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"section" text,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_assessment_conclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"summary" text,
	"strengths" text,
	"areas_for_improvement" text,
	"final_score" integer,
	"promotion_recommendation" text,
	"potential_flag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "performance_assessment_conclusions_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_assessment_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"response" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"cycle_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'not_started',
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"is_auto_generated" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback_questions" (
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
CREATE TABLE IF NOT EXISTS "performance_feedback_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer" text NOT NULL,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback_rule_scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"type" text NOT NULL,
	"reference_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"group" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"office_only" boolean DEFAULT false,
	"department_only" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"enable_employee_feedback" boolean DEFAULT true,
	"enable_manager_feedback" boolean DEFAULT true,
	"allow_anonymous" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback_viewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"can_view" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"is_anonymous" boolean DEFAULT false,
	"submitted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"is_archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_competencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_competency_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"weight" integer NOT NULL,
	CONSTRAINT "performance_competency_levels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_role_competency_expectations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"role_id" uuid NOT NULL,
	"competency_id" uuid NOT NULL,
	"expected_level_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_review_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"competency_id" uuid,
	"question" text NOT NULL,
	"type" text NOT NULL,
	"is_mandatory" boolean DEFAULT false,
	"allow_notes" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_review_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"include_goals" boolean DEFAULT false,
	"include_attendance" boolean DEFAULT false,
	"include_feedback" boolean DEFAULT false,
	"include_questionnaire" boolean DEFAULT false,
	"require_signature" boolean DEFAULT false,
	"restrict_visibility" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_template_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order" integer DEFAULT 0,
	"is_mandatory" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_field_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status",
	"changed_at" timestamp with time zone DEFAULT now(),
	"changed_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_question_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
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
CREATE TABLE IF NOT EXISTS "candidates" (
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
CREATE TABLE IF NOT EXISTS "candidate_skills" (
	"candidate_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interview_email_templates" (
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
CREATE TABLE IF NOT EXISTS "interview_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"submitted_by" uuid,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interview_interviewers" (
	"interview_id" uuid NOT NULL,
	"interviewer_id" uuid NOT NULL,
	"scorecard_template_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interviews" (
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
CREATE TABLE IF NOT EXISTS "scorecard_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"description" varchar(255),
	"max_score" integer DEFAULT 5 NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scorecard_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_system" boolean DEFAULT false,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" varchar(50) NOT NULL,
	"label" varchar(255) NOT NULL,
	"field_type" varchar(50) NOT NULL,
	"is_global" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_form_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"style" "application_style" NOT NULL,
	"include_references" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "application_form_configs_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_form_fields" (
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
CREATE TABLE IF NOT EXISTS "application_form_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"question" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"required" boolean DEFAULT true,
	"order" integer NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_postings" (
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
CREATE TABLE IF NOT EXISTS "generated_offer_letters" (
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
CREATE TABLE IF NOT EXISTS "offer_letter_template_variable_links" (
	"template_id" uuid NOT NULL,
	"variable_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offer_letter_template_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT true,
	"company_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offer_letter_templates" (
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
CREATE TABLE IF NOT EXISTS "offers" (
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
CREATE TABLE IF NOT EXISTS "pipeline_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now(),
	"moved_by" uuid,
	"feedback" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_stage_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_template_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_global" boolean DEFAULT false,
	"company_id" uuid,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
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
CREATE TABLE IF NOT EXISTS "attendance_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_record_id" uuid NOT NULL,
	"adjusted_clock_in" timestamp,
	"adjusted_clock_out" timestamp,
	"reason" text,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_records" (
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
CREATE TABLE IF NOT EXISTS "employee_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_id" uuid,
	"shift_date" date NOT NULL,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shifts" (
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
CREATE TABLE IF NOT EXISTS "approval_steps" (
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
CREATE TABLE IF NOT EXISTS "approval_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "company_settings_company_id_key_unique" UNIQUE("company_id","key")
);
CREATE INDEX IF NOT EXISTS "announcement_categories_company_id_idx" ON "announcement_categories" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_categories_id_idx" ON "announcement_categories" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_comments_announcement_id_idx" ON "announcement_comments" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_comments_created_by_idx" ON "announcement_comments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_comments_created_at_idx" ON "announcement_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_reactions_announcement_id_idx" ON "announcement_reactions" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_reactions_created_by_idx" ON "announcement_reactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcement_reactions_reaction_type_idx" ON "announcement_reactions" USING btree ("reaction_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_company_id_idx" ON "announcements" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_category_id_idx" ON "announcements" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_department_id_idx" ON "announcements" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_location_id_idx" ON "announcements" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_published_at_idx" ON "announcements" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_is_published_idx" ON "announcements" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_created_by_idx" ON "announcements" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reactions_comment_id_idx" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reactions_created_by_idx" ON "comment_reactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comment_reactions_reaction_type_idx" ON "comment_reactions" USING btree ("reaction_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_approvals_asset_request_id_idx" ON "asset_approvals" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_approvals_step_id_idx" ON "asset_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_approvals_actor_id_idx" ON "asset_approvals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_approvals_action_idx" ON "asset_approvals" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_reports_employee_id_idx" ON "asset_reports" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_reports_company_id_idx" ON "asset_reports" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_reports_asset_id_idx" ON "asset_reports" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_reports_report_type_idx" ON "asset_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_reports_status_idx" ON "asset_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_reports_reported_at_idx" ON "asset_reports" USING btree ("reported_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_requests_employee_id_idx" ON "asset_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_requests_company_id_idx" ON "asset_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_requests_status_idx" ON "asset_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_requests_request_date_idx" ON "asset_requests" USING btree ("request_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_requests_asset_type_idx" ON "asset_requests" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_requests_urgency_idx" ON "asset_requests" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_internal_id_idx" ON "assets" USING btree ("internal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_company_id_idx" ON "assets" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_location_id_idx" ON "assets" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_employee_id_idx" ON "assets" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_category_idx" ON "assets" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_purchase_date_idx" ON "assets" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_role_permissions" ON "company_role_permissions" USING btree ("company_role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_permission_id" ON "company_role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_role_permission_unique" ON "company_role_permissions" USING btree ("company_role_id","permission_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id_permission" ON "company_roles" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_role_unique" ON "company_roles" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "permissions_key_unique" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_id_password_reset" ON "PasswordResetToken" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_role_id" ON "users" USING btree ("company_role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_id_verification" ON "verificationToken" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_enrollments_benefit_plan_id_idx" ON "benefit_enrollments" USING btree ("benefit_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_enrollments_employee_id_idx" ON "benefit_enrollments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_enrollments_enrolled_at_idx" ON "benefit_enrollments" USING btree ("enrolled_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_groups_company_id_idx" ON "benefit_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_groups_name_idx" ON "benefit_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_groups_created_at_idx" ON "benefit_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_company_id_idx" ON "benefit_plans" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_benefit_group_id_idx" ON "benefit_plans" USING btree ("benefit_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_name_idx" ON "benefit_plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_category_idx" ON "benefit_plans" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_start_date_idx" ON "benefit_plans" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_end_date_idx" ON "benefit_plans" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benefit_plans_created_at_idx" ON "benefit_plans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_locations_companyId" ON "company_locations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id_tax_details" ON "company_tax_details" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tin_tax_details" ON "company_tax_details" USING btree ("tin");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_companies_domain" ON "companies" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companies_country" ON "companies" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cost_centers_company_code" ON "cost_centers" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cost_centers_company" ON "cost_centers" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_departments_company_name" ON "departments" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_departments_company" ON "departments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_certifications_employee_id_idx" ON "employee_certifications" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_certifications_name_idx" ON "employee_certifications" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_certifications_issue_date_idx" ON "employee_certifications" USING btree ("issue_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_certifications_expiry_date_idx" ON "employee_certifications" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_certifications_created_at_idx" ON "employee_certifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_compensations_employee_id_idx" ON "employee_compensations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_compensations_effective_date_idx" ON "employee_compensations" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_compensations_created_at_idx" ON "employee_compensations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_dependents_employee_id_idx" ON "employee_dependents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_dependents_name_idx" ON "employee_dependents" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_dependents_relationship_idx" ON "employee_dependents" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_dependents_date_of_birth_idx" ON "employee_dependents" USING btree ("date_of_birth");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_dependents_is_beneficiary_idx" ON "employee_dependents" USING btree ("is_beneficiary");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_dependents_created_at_idx" ON "employee_dependents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_documents_employee" ON "employee_documents" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_sequences_next_number_idx" ON "employee_sequences" USING btree ("next_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_company_id_idx" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_department_id_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_job_role_id_idx" ON "employees" USING btree ("job_role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_manager_id_idx" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_cost_center_id_idx" ON "employees" USING btree ("cost_center_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_location_id_idx" ON "employees" USING btree ("company_location");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_pay_group_id_idx" ON "employees" USING btree ("pay_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_employment_status_idx" ON "employees" USING btree ("employment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_employment_start_date_idx" ON "employees" USING btree ("employment_start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_probation_end_date_idx" ON "employees" USING btree ("probation_end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_first_name_idx" ON "employees" USING btree ("first_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_last_name_idx" ON "employees" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_created_at_idx" ON "employees" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employees_updated_at_idx" ON "employees" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_financials_bank_name_idx" ON "employee_financials" USING btree ("bank_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_financials_currency_idx" ON "employee_financials" USING btree ("currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_financials_created_at_idx" ON "employee_financials" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pk_group_membership_composite" ON "employee_group_memberships" USING btree ("group_id","employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_memberships_group" ON "employee_group_memberships" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_memberships_employee" ON "employee_group_memberships" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_group_memberships_primary" ON "employee_group_memberships" USING btree ("employee_id","is_primary");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_groups_company_type" ON "employee_groups" USING btree ("company_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_groups_parent" ON "employee_groups" USING btree ("parent_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_groups_company_name" ON "employee_groups" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_groups_company_slug" ON "employee_groups" USING btree ("company_id","slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_history_employee_id_idx" ON "employee_history" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_history_type_idx" ON "employee_history" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_history_start_date_idx" ON "employee_history" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_history_end_date_idx" ON "employee_history" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_history_created_at_idx" ON "employee_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_employee_id_idx" ON "employee_profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_date_of_birth_idx" ON "employee_profiles" USING btree ("date_of_birth");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_gender_idx" ON "employee_profiles" USING btree ("gender");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_marital_status_idx" ON "employee_profiles" USING btree ("marital_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_state_idx" ON "employee_profiles" USING btree ("state");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_country_idx" ON "employee_profiles" USING btree ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_profiles_created_at_idx" ON "employee_profiles" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_job_roles_company_title" ON "job_roles" USING btree ("company_id","title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_roles_company" ON "job_roles" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_approvals_expense_id_idx" ON "expense_approvals" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_approvals_step_id_idx" ON "expense_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_approvals_actor_id_idx" ON "expense_approvals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_approvals_action_idx" ON "expense_approvals" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_approvals_created_at_idx" ON "expense_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_company_id_idx" ON "expenses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_employee_id_idx" ON "expenses" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_submitted_at_idx" ON "expenses" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_created_at_idx" ON "expenses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_company_id_idx" ON "holidays" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_date_idx" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_name_idx" ON "holidays" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_year_idx" ON "holidays" USING btree ("year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_type_idx" ON "holidays" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_country_idx" ON "holidays" USING btree ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holidays_source_idx" ON "holidays" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_balances_company_id_idx" ON "leave_balances" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_balances_employee_id_idx" ON "leave_balances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_balances_leave_type_id_idx" ON "leave_balances" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_balances_year_idx" ON "leave_balances" USING btree ("year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_policies_company_id_idx" ON "leave_policies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_policies_leave_type_id_idx" ON "leave_policies" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_policies_accrual_enabled_idx" ON "leave_policies" USING btree ("accrual_enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_policies_accrual_frequency_idx" ON "leave_policies" USING btree ("accrual_frequency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_policies_gender_eligibility_idx" ON "leave_policies" USING btree ("gender_eligibility");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_policies_created_at_idx" ON "leave_policies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_company_id_idx" ON "leave_requests" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_employee_id_idx" ON "leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_leave_type_id_idx" ON "leave_requests" USING btree ("leave_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_requested_at_idx" ON "leave_requests" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_approved_at_idx" ON "leave_requests" USING btree ("approved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_start_date_idx" ON "leave_requests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_requests_end_date_idx" ON "leave_requests" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_types_name_idx" ON "leave_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_types_is_paid_idx" ON "leave_types" USING btree ("is_paid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_types_company_id_idx" ON "leave_types" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leave_types_created_at_idx" ON "leave_types" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_checklist_company_id_idx" ON "termination_checklist_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_checklist_is_global_idx" ON "termination_checklist_items" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_checklist_name_idx" ON "termination_checklist_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_reasons_company_id_idx" ON "termination_reasons" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_reasons_is_global_idx" ON "termination_reasons" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_reasons_name_idx" ON "termination_reasons" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_termination_checklist_session_id_idx" ON "employee_termination_checklist" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_sessions_employee_id_idx" ON "termination_sessions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_sessions_company_id_idx" ON "termination_sessions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_sessions_status_idx" ON "termination_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_types_company_id_idx" ON "termination_types" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_types_is_global_idx" ON "termination_types" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "termination_types_name_idx" ON "termination_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_onboarding_employee_id_idx" ON "employee_onboarding" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_onboarding_template_id_idx" ON "employee_onboarding" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_onboarding_status_idx" ON "employee_onboarding" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_onboarding_company_id_idx" ON "employee_onboarding" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_checklist_status_employee_id_idx" ON "employee_checklist_status" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_template_checklists_template_id_idx" ON "onboarding_template_checklists" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_template_fields_template_id_idx" ON "onboarding_template_fields" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_template_fields_field_key_idx" ON "onboarding_template_fields" USING btree ("field_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_template_fields_tag_idx" ON "onboarding_template_fields" USING btree ("tag");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_templates_name_idx" ON "onboarding_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lifecycle_tokens_employee_id_idx" ON "employee_lifecycle_tokens" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lifecycle_tokens_type_idx" ON "employee_lifecycle_tokens" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_company_id_idx" ON "notification" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_employee_id_idx" ON "notification" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notification" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notification" USING btree ("read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notification" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_id_off_cycle" ON "off_cycle_payroll" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id_off_cycle" ON "off_cycle_payroll" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payroll_date_off_cycle" ON "off_cycle_payroll" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loan_sequences_next_number_idx" ON "loan_sequences" USING btree ("next_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_loan_id_repayments" ON "repayments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_paid_at_repayments" ON "repayments" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id_loans" ON "salary_advance" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_id_loans" ON "salary_advance" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_loans" ON "salary_advance" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id_loan_history" ON "salary_advance_history" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_loan_id_loan_history" ON "salary_advance_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_loan_history" ON "salary_advance_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_created_at_loan_history" ON "salary_advance_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deduction_types_name_idx" ON "deduction_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deduction_types_code_idx" ON "deduction_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_deductions_employee_id_idx" ON "employee_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_deductions_deduction_type_id_idx" ON "employee_deductions" USING btree ("deduction_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_deductions_rate_type_idx" ON "employee_deductions" USING btree ("rate_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_deductions_start_date_idx" ON "employee_deductions" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_deductions_is_active_idx" ON "employee_deductions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filing_voluntary_deductions_company_id_idx" ON "filing_voluntary_deductions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filing_voluntary_deductions_employee_id_idx" ON "filing_voluntary_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filing_voluntary_deductions_payroll_id_idx" ON "filing_voluntary_deductions" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filing_voluntary_deductions_payroll_month_idx" ON "filing_voluntary_deductions" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filing_voluntary_deductions_status_idx" ON "filing_voluntary_deductions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "filing_voluntary_deductions_created_at_idx" ON "filing_voluntary_deductions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_group_allowances_pay_group_id_idx" ON "pay_group_allowances" USING btree ("pay_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_group_allowances_allowance_type_idx" ON "pay_group_allowances" USING btree ("allowance_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_group_allowances_value_type_idx" ON "pay_group_allowances" USING btree ("value_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_group_allowances_created_at_idx" ON "pay_group_allowances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_groups_name_idx" ON "pay_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_groups_pay_schedule_id_idx" ON "pay_groups" USING btree ("pay_schedule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_groups_company_id_idx" ON "pay_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_groups_created_at_idx" ON "pay_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_groups_is_deleted_idx" ON "pay_groups" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_schedules_company_id_idx" ON "pay_schedules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_schedules_start_date_idx" ON "pay_schedules" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_schedules_pay_frequency_idx" ON "pay_schedules" USING btree ("pay_frequency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_schedules_is_deleted_idx" ON "pay_schedules" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pay_schedules_created_at_idx" ON "pay_schedules" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_company_id_idx" ON "payroll_adjustments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_employee_id_idx" ON "payroll_adjustments" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_payroll_date_idx" ON "payroll_adjustments" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_type_idx" ON "payroll_adjustments" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_is_deleted_idx" ON "payroll_adjustments" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_created_by_idx" ON "payroll_adjustments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_adjustments_created_at_idx" ON "payroll_adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_allowances_payroll_id_idx" ON "payroll_allowances" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_allowances_employee_id_idx" ON "payroll_allowances" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_allowances_allowance_type_idx" ON "payroll_allowances" USING btree ("allowance_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_allowances_created_at_idx" ON "payroll_allowances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_bonuses_company_id_idx" ON "payroll_bonuses" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_bonuses_employee_id_idx" ON "payroll_bonuses" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_bonuses_created_by_idx" ON "payroll_bonuses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_bonuses_effective_date_idx" ON "payroll_bonuses" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_bonuses_status_idx" ON "payroll_bonuses" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_bonuses_created_at_idx" ON "payroll_bonuses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deductions_company_id_idx" ON "payroll_deductions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deductions_employee_id_idx" ON "payroll_deductions" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deductions_created_by_idx" ON "payroll_deductions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deductions_effective_date_idx" ON "payroll_deductions" USING btree ("effective_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deductions_status_idx" ON "payroll_deductions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_deductions_created_at_idx" ON "payroll_deductions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_overrides_employee_id_idx" ON "payroll_overrides" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_overrides_company_id_idx" ON "payroll_overrides" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_overrides_payroll_date_idx" ON "payroll_overrides" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_overrides_force_include_idx" ON "payroll_overrides" USING btree ("force_include");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_overrides_created_at_idx" ON "payroll_overrides" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_payroll_run_id_idx" ON "payroll" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_employee_id_idx" ON "payroll" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_company_id_idx" ON "payroll" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_user_id_idx" ON "payroll" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_payroll_date_idx" ON "payroll" USING btree ("payroll_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_payroll_month_idx" ON "payroll" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_payment_status_idx" ON "payroll" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_requested_by_idx" ON "payroll" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_requested_at_idx" ON "payroll" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_approval_status_idx" ON "payroll" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_last_approved_by_idx" ON "payroll" USING btree ("last_approved_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_workflow_id_idx" ON "payroll" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_current_step_idx" ON "payroll" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_created_at_idx" ON "payroll" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_approvals_payroll_run_id_idx" ON "payroll_approvals" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_approvals_step_id_idx" ON "payroll_approvals" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_approvals_actor_id_idx" ON "payroll_approvals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_approvals_created_at_idx" ON "payroll_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payroll_run_id_ytd_payroll" ON "payroll_ytd" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_id_ytd_payroll" ON "payroll_ytd" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payroll_month_ytd_payroll" ON "payroll_ytd" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_year_ytd_payroll" ON "payroll_ytd" USING btree ("year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_payroll_id_idx" ON "payslips" USING btree ("payroll_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_employee_id_idx" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_company_id_idx" ON "payslips" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_payroll_month_idx" ON "payslips" USING btree ("payroll_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_slip_status_idx" ON "payslips" USING btree ("slip_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payslips_issued_at_idx" ON "payslips" USING btree ("issued_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_filing_id_tax_filing_details" ON "tax_filing_details" USING btree ("tax_filing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_employee_id_tax_filing_details" ON "tax_filing_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tin_tax_filing_details" ON "tax_filing_details" USING btree ("tin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_id_tax_filings" ON "tax_filings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tax_type_tax_filings" ON "tax_filings" USING btree ("tax_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_tin_tax_filings" ON "tax_filings" USING btree ("company_tin");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_tax_filings" ON "tax_filings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_section_comments_assessment_id_idx" ON "performance_assessment_section_comments" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_section_comments_section_idx" ON "performance_assessment_section_comments" USING btree ("section");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_responses_assessment_id_idx" ON "performance_assessment_responses" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assessment_responses_question_id_idx" ON "performance_assessment_responses" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_assessments_company_id_idx" ON "performance_assessments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_assessments_cycle_id_idx" ON "performance_assessments" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_question_feedback_id" ON "performance_feedback_responses" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_viewers_feedback_id" ON "performance_feedback_viewers" USING btree ("feedback_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_viewers_user_id" ON "performance_feedback_viewers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_recipient_id" ON "performance_feedback" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_sender_id" ON "performance_feedback" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_competencies_company_id" ON "performance_competencies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_competencies_name" ON "performance_competencies" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_review_questions_company_id" ON "performance_review_questions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_review_questions_competency" ON "performance_review_questions" USING btree ("competency_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_review_questions_is_global" ON "performance_review_questions" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_review_templates_company_id" ON "performance_review_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_review_templates_default" ON "performance_review_templates" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_questions_template_id" ON "performance_template_questions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_template_questions_question_id" ON "performance_template_questions" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apphist_app" ON "application_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_app_job" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_app_cand" ON "applications" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_app_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_email" ON "candidates" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cand_source" ON "candidates" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_candskill_cand" ON "candidate_skills" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ii_interview" ON "interview_interviewers" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ii_interviewer" ON "interview_interviewers" USING btree ("interviewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_int_app" ON "interviews" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scorecard_company" ON "scorecard_templates" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_company" ON "job_postings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_status" ON "job_postings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_posted_at" ON "job_postings" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offer_letter_offer_id" ON "generated_offer_letters" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offer_letter_candidate_id" ON "generated_offer_letters" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offer_letter_template_id" ON "generated_offer_letters" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offer_letter_status" ON "generated_offer_letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_variable_link_idx" ON "offer_letter_template_variable_links" USING btree ("template_id","variable_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_variable_name_idx" ON "offer_letter_template_variables" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_variable_company_idx" ON "offer_letter_template_variables" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_off_app" ON "offers" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_off_status" ON "offers" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_off_signing_method" ON "offers" USING btree ("signing_method");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pipehist_app" ON "pipeline_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pipehist_stage" ON "pipeline_history" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stage_instance_app" ON "pipeline_stage_instances" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stage_instance_stage" ON "pipeline_stage_instances" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stage_job" ON "pipeline_stages" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stage_job_order" ON "pipeline_stages" USING btree ("job_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tplstg_template" ON "pipeline_template_stages" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tplstg_template_order" ON "pipeline_template_stages" USING btree ("template_id","order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_att_parent" ON "attachments" USING btree ("parent_type","parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_att_upload" ON "attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_adjustments_record_id_idx" ON "attendance_adjustments" USING btree ("attendance_record_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_adjustments_approved_by_idx" ON "attendance_adjustments" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_adjustments_created_at_idx" ON "attendance_adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_company_id_idx" ON "attendance_records" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_employee_id_idx" ON "attendance_records" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_clock_in_idx" ON "attendance_records" USING btree ("clock_in");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_clock_out_idx" ON "attendance_records" USING btree ("clock_out");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_records_created_at_idx" ON "attendance_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_shifts_company_id_idx" ON "employee_shifts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_shifts_employee_id_idx" ON "employee_shifts" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_shifts_shift_id_idx" ON "employee_shifts" USING btree ("shift_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_shifts_shift_date_idx" ON "employee_shifts" USING btree ("shift_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_shifts_is_deleted_idx" ON "employee_shifts" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_shifts_created_at_idx" ON "employee_shifts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_company_id_idx" ON "shifts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_location_id_idx" ON "shifts" USING btree ("company_location");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_name_idx" ON "shifts" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_is_deleted_idx" ON "shifts" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shifts_created_at_idx" ON "shifts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_steps_workflow_id_idx" ON "approval_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_steps_sequence_idx" ON "approval_steps" USING btree ("sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_steps_role_idx" ON "approval_steps" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_steps_status_idx" ON "approval_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_steps_created_at_idx" ON "approval_steps" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_workflows_name_idx" ON "approval_workflows" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_workflows_company_id_idx" ON "approval_workflows" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_workflows_entity_id_idx" ON "approval_workflows" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_workflows_entity_date_idx" ON "approval_workflows" USING btree ("entity_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approval_workflows_created_at_idx" ON "approval_workflows" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_settings" ON "company_settings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_company_settings_key" ON "company_settings" USING btree ("key");