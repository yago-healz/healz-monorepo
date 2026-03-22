CREATE TABLE "patient_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"whatsapp_id" varchar(100),
	"name" varchar(255),
	"cpf" varchar(14),
	"date_of_birth" date,
	"patient_id" uuid,
	"source" varchar(20) DEFAULT 'carol' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "patient_contacts" ADD CONSTRAINT "patient_contacts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_patient_contact_phone" ON "patient_contacts" USING btree ("clinic_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_patient_contact_cpf" ON "patient_contacts" USING btree ("clinic_id","cpf");--> statement-breakpoint
CREATE INDEX "idx_patient_contacts_clinic" ON "patient_contacts" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_patient_contacts_phone" ON "patient_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_patient_contacts_patient" ON "patient_contacts" USING btree ("patient_id");