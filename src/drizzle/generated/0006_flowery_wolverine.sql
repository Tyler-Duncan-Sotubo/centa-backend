ALTER TABLE "companies" ALTER COLUMN "country" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "pay_frequency" text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_company_name" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_registration_number" ON "companies" USING btree ("registration_number");--> statement-breakpoint
CREATE INDEX "idx_country" ON "companies" USING btree ("country");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_registration_number_unique" UNIQUE("registration_number");