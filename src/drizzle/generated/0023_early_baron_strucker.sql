ALTER TABLE "google_accounts" DROP CONSTRAINT "google_accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" DROP COLUMN "user_id";