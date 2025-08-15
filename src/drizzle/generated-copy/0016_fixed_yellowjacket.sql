ALTER TABLE "performance_assessments" DROP CONSTRAINT "performance_assessments_reviewee_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_assessments" ADD CONSTRAINT "performance_assessments_reviewee_id_employees_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;