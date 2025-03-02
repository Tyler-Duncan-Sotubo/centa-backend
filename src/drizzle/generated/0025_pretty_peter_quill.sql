CREATE TABLE "tax-config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apply_paye" boolean DEFAULT false,
	"apply_nhf" boolean DEFAULT false,
	"apply_pension" boolean DEFAULT false,
	"company_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tax-config" ADD CONSTRAINT "tax-config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;