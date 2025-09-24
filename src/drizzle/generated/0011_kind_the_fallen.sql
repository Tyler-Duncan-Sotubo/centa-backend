ALTER TABLE "benefit_groups" DROP CONSTRAINT "benefit_groups_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "benefit_groups" ADD CONSTRAINT "benefit_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;