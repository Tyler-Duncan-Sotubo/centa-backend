ALTER TABLE "employee_tax_details" ALTER COLUMN "state_of_residence" SET DEFAULT 'Lagos';--> statement-breakpoint
ALTER TABLE "employee_tax_details" ALTER COLUMN "state_of_residence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_tax_details" ADD COLUMN "pension_pin" text;--> statement-breakpoint
ALTER TABLE "employee_tax_details" ADD COLUMN "nhf_number" text;--> statement-breakpoint
ALTER TABLE "employee_tax_details" DROP COLUMN "other_reliefs";--> statement-breakpoint
ALTER TABLE "employee_tax_details" DROP COLUMN "has_exemptions";--> statement-breakpoint
ALTER TABLE "employee_tax_details" DROP COLUMN "additional_details";