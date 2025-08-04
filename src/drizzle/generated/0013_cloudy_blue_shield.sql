ALTER TABLE "performance_feedback" DROP CONSTRAINT "performance_feedback_recipient_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "performance_feedback" ADD CONSTRAINT "performance_feedback_recipient_id_employees_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;