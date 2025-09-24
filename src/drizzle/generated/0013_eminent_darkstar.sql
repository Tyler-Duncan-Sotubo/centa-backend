ALTER TABLE "salary_advance" DROP CONSTRAINT "salary_advance_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance" ADD CONSTRAINT "salary_advance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;