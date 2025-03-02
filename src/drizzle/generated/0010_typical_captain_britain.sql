ALTER TABLE "companies" DROP CONSTRAINT "companies_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_user_id_companies";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "user_id";