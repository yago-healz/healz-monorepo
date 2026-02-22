CREATE TABLE "appointment_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"reason" text,
	"notes" text,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_appointment_patient" ON "appointment_view" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_clinic" ON "appointment_view" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_doctor" ON "appointment_view" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_appointment_scheduled_at" ON "appointment_view" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_appointment_status" ON "appointment_view" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_appointment_doctor_time" ON "appointment_view" USING btree ("doctor_id","scheduled_at");