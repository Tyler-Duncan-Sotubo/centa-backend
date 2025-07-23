CREATE TABLE "generated_offer_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"offer_id" uuid,
	"template_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "offers" ALTER COLUMN "currency" SET DEFAULT 'NGN';--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "signing_method" varchar(20) DEFAULT 'pdf' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "signed_letter_url" varchar(500);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "signing_envelope_id" varchar(255);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "signing_url" varchar(500);--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "generated_offer_letters" ADD CONSTRAINT "generated_offer_letters_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_offer_letters" ADD CONSTRAINT "generated_offer_letters_template_id_offer_letter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."offer_letter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_offer_letter_offer_id" ON "generated_offer_letters" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_candidate_id" ON "generated_offer_letters" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_template_id" ON "generated_offer_letters" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_offer_letter_status" ON "generated_offer_letters" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_off_signing_method" ON "offers" USING btree ("signing_method");