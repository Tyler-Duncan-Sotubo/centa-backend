ALTER TABLE "benefit_plans" DROP CONSTRAINT "benefit_plans_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "benefit_plans" ADD CONSTRAINT "benefit_plans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;