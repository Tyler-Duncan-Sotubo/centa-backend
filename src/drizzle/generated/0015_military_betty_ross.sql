ALTER TABLE "company_file_folders" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "company_file_folders" ADD CONSTRAINT "company_file_folders_parent_id_company_file_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."company_file_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_file_folders_company_id_idx" ON "company_file_folders" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_file_folders_parent_id_idx" ON "company_file_folders" USING btree ("parent_id");