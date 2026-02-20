CREATE TABLE "employee_allowed_locations" (
	"employee_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_allowed_locations_employee_id_location_id_pk" PRIMARY KEY("employee_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "employee_allowed_locations" ADD CONSTRAINT "employee_allowed_locations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_allowed_locations" ADD CONSTRAINT "employee_allowed_locations_location_id_company_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."company_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_allowed_locations_employee_idx" ON "employee_allowed_locations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_allowed_locations_location_idx" ON "employee_allowed_locations" USING btree ("location_id");