ALTER TABLE "announcement_categories" DROP CONSTRAINT "announcement_categories_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "announcement_categories" ADD CONSTRAINT "announcement_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;