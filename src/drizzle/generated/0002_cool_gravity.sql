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
CREATE TABLE "tax_filing_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_filing_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"basic_salary" numeric(10, 2) NOT NULL,
	"contribution_amount" numeric(10, 2) NOT NULL,
	"tin" text,
	"reference_number" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"tax_type" text NOT NULL,
	"payroll_month" date NOT NULL,
	"company_tin" text NOT NULL,
	"reference_number" text,
	"status" text DEFAULT 'pending',
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "company_tax_details" ADD CONSTRAINT "company_tax_details_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_details" ADD CONSTRAINT "tax_filing_details_tax_filing_id_tax_filings_id_fk" FOREIGN KEY ("tax_filing_id") REFERENCES "public"."tax_filings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filing_details" ADD CONSTRAINT "tax_filing_details_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_filings" ADD CONSTRAINT "tax_filings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_id_tax_details" ON "company_tax_details" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_tin_tax_details" ON "company_tax_details" USING btree ("tin");--> statement-breakpoint
CREATE INDEX "idx_tax_filing_id_tax_filing_details" ON "tax_filing_details" USING btree ("tax_filing_id");--> statement-breakpoint
CREATE INDEX "idx_employee_id_tax_filing_details" ON "tax_filing_details" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_tin_tax_filing_details" ON "tax_filing_details" USING btree ("tin");--> statement-breakpoint
CREATE INDEX "idx_company_id_tax_filings" ON "tax_filings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_tax_type_tax_filings" ON "tax_filings" USING btree ("tax_type");--> statement-breakpoint
CREATE INDEX "idx_company_tin_tax_filings" ON "tax_filings" USING btree ("company_tin");--> statement-breakpoint
CREATE INDEX "idx_status_tax_filings" ON "tax_filings" USING btree ("status");--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "Tin";