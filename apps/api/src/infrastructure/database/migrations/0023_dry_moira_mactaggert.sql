CREATE TABLE "doctor_appointment_gcal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"gcal_event_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "doctor_appointment_gcal_events_appointment_id_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_google_calendar_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"selected_calendar_id" varchar(255),
	"selected_calendar_name" varchar(255),
	"google_account_email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "doctor_google_calendar_credentials" ADD CONSTRAINT "doctor_google_calendar_credentials_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_google_calendar_credentials" ADD CONSTRAINT "doctor_google_calendar_credentials_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_doctor_clinic_gcal" ON "doctor_google_calendar_credentials" USING btree ("doctor_id","clinic_id");--> statement-breakpoint
CREATE INDEX "idx_dgcal_doctor" ON "doctor_google_calendar_credentials" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_dgcal_clinic" ON "doctor_google_calendar_credentials" USING btree ("clinic_id");