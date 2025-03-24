ALTER TABLE "tax-config" RENAME TO "tax_config";--> statement-breakpoint
ALTER TABLE "tax_config" DROP CONSTRAINT "tax-config_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "tax_config" ADD CONSTRAINT "tax_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;