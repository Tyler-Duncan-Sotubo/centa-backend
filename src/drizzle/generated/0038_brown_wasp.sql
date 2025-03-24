ALTER TABLE "repayments" ALTER COLUMN "amount_paid" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "salary_advance" ALTER COLUMN "amount" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "salary_advance" ALTER COLUMN "total_paid" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "salary_advance" ALTER COLUMN "total_paid" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "salary_advance" ALTER COLUMN "preferred_monthly_payment" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "salary_advance" ALTER COLUMN "preferred_monthly_payment" SET DEFAULT 0;