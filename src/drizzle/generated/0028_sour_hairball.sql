CREATE TABLE "offer_letter_template_variable_links" (
	"template_id" uuid NOT NULL,
	"variable_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_letter_template_variables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_system" boolean DEFAULT true,
	"company_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offer_letter_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_system_template" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"cloned_from_template_id" uuid
);
--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "offer_letter_template_variable_links" ADD CONSTRAINT "offer_letter_template_variable_links_template_id_offer_letter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_letter_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_template_variable_links" ADD CONSTRAINT "offer_letter_template_variable_links_variable_id_offer_letter_template_variables_id_fk" FOREIGN KEY ("variable_id") REFERENCES "public"."offer_letter_template_variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_template_variables" ADD CONSTRAINT "offer_letter_template_variables_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_letter_templates" ADD CONSTRAINT "offer_letter_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "template_variable_link_idx" ON "offer_letter_template_variable_links" USING btree ("template_id","variable_id");--> statement-breakpoint
CREATE INDEX "template_variable_name_idx" ON "offer_letter_template_variables" USING btree ("name");--> statement-breakpoint
CREATE INDEX "template_variable_company_idx" ON "offer_letter_template_variables" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_template_id_offer_letter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_letter_templates"("id") ON DELETE no action ON UPDATE no action;