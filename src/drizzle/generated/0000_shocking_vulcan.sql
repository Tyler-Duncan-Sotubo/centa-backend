CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"country" text,
	"city" text,
	"postal_code" text,
	"industry" text,
	"registration_number" text,
	"Tin" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"email" text NOT NULL,
	"phone" text,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL,
	"employee_id" uuid
);
--> statement-breakpoint
CREATE TABLE "custom_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"deduction_name" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"deduction_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nhf_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_rate" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paye_tax_brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_salary" integer NOT NULL,
	"max_salary" integer NOT NULL,
	"tax_rate" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pension_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_contribution_rate" integer NOT NULL,
	"employer_contribution_rate" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"head_of_department" uuid,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "employee_bank_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_account_number" text,
	"bank_account_name" text,
	"bank_name" text,
	"employee_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"apply_paye" boolean DEFAULT false,
	"apply_pension" boolean DEFAULT false,
	"apply_nhf" boolean DEFAULT false,
	"apply_additional" boolean DEFAULT false,
	"is_demo" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"company_id" uuid NOT NULL,
	CONSTRAINT "employee_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "employee_tax_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tin" text NOT NULL,
	"consolidated_relief_allowance" integer DEFAULT 0,
	"other_reliefs" integer DEFAULT 0,
	"state_of_residence" text NOT NULL,
	"has_exemptions" boolean DEFAULT false,
	"additional_details" json DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"employee_id" uuid NOT NULL,
	CONSTRAINT "employee_tax_details_tin_unique" UNIQUE("tin")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"job_title" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"employment_status" text NOT NULL,
	"start_date" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"annual_gross" integer DEFAULT 0,
	"hourly_rate" integer DEFAULT 0,
	"bonus" integer DEFAULT 0,
	"commission" integer DEFAULT 0,
	"is_demo" boolean DEFAULT false,
	"user_id" uuid,
	"company_id" uuid NOT NULL,
	"department_id" uuid,
	"group_id" uuid,
	CONSTRAINT "employees_employee_number_unique" UNIQUE("employee_number"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
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
CREATE TABLE "bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"bonus_type" text DEFAULT 'performance',
	"bonus_date" date DEFAULT now() NOT NULL,
	"payroll_month" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"gross_salary" integer NOT NULL,
	"paye_tax" integer NOT NULL,
	"pension_contribution" integer NOT NULL,
	"nhf_contribution" integer NOT NULL,
	"bonuses" integer DEFAULT 0,
	"net_salary" integer NOT NULL,
	"payroll_date" date NOT NULL,
	"payroll_month" text NOT NULL,
	"custom_deductions" integer DEFAULT 0,
	"total_deductions" integer NOT NULL,
	"payment_status" text DEFAULT 'pending',
	"payment_date" date,
	"payment_reference" text DEFAULT '',
	"approval_status" text DEFAULT 'pending',
	"approval_date" date,
	"approval_remarks" text DEFAULT '',
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issued_at" date DEFAULT now(),
	"payroll_month" text NOT NULL,
	"slip_status" text DEFAULT 'issued',
	"employer_remarks" text DEFAULT '',
	"payroll_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_breakdown" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"basic" integer NOT NULL,
	"housing" integer NOT NULL,
	"transport" integer NOT NULL,
	"others" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "role_enum" DEFAULT 'employee' NOT NULL,
	"plan" text DEFAULT 'free',
	"is_verified" boolean DEFAULT false,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
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
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contact" ADD CONSTRAINT "company_contact_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_files" ADD CONSTRAINT "company_files_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_deductions" ADD CONSTRAINT "custom_deductions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_deductions" ADD CONSTRAINT "custom_deductions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_bank_details" ADD CONSTRAINT "employee_bank_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_groups" ADD CONSTRAINT "employee_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_tax_details" ADD CONSTRAINT "employee_tax_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_group_id_employee_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."employee_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_id_payroll_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payroll"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_breakdown" ADD CONSTRAINT "salary_breakdown_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificationToken" ADD CONSTRAINT "verificationToken_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_user_id_companies" ON "companies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_company_contact" ON "company_contact" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_company_files" ON "company_files" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_company_files" ON "company_files" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_departments" ON "departments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_employee_bank_details" ON "employee_bank_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_name_employee_groups" ON "employee_groups" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_company_id_employees_groups" ON "employee_groups" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_employee_tax_details" ON "employee_tax_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_company_id_employees" ON "employees" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_department_id_employees" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_user_id_employees" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_id_password_reset" ON "PasswordResetToken" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_id_verification" ON "verificationToken" USING btree ("user_id");