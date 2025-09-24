ALTER TABLE "salary_advance_history" DROP CONSTRAINT "salary_advance_history_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "salary_advance_history" ADD CONSTRAINT "salary_advance_history_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;