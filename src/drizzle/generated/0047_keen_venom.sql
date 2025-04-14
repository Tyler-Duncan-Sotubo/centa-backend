CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"total_hours" integer,
	"employee_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"location_name" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"type" text,
	"country_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_type" text NOT NULL,
	"total_leave_days" integer NOT NULL,
	"used_leave_days" integer DEFAULT 0,
	"remaining_leave_days" integer DEFAULT 0,
	"employee_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"leave_status" text DEFAULT 'pending',
	"total_days_off" integer DEFAULT 0,
	"employee_id" uuid NOT NULL,
	"approved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leave_type" text NOT NULL,
	"leave_entitlement" integer NOT NULL,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "office_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"location_name" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"address" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" integer PRIMARY KEY NOT NULL,
	"customer_code" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "customers_customer_code_unique" UNIQUE("customer_code")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" integer PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"customer_code" varchar(255) NOT NULL,
	"bank_id" integer NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"bank_slug" varchar(100) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_locations" ADD CONSTRAINT "employee_locations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_balance" ADD CONSTRAINT "leave_balance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_locations" ADD CONSTRAINT "office_locations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;