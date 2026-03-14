CREATE TYPE "public"."payment_method_type" AS ENUM('pix', 'credit_card', 'debit_card', 'cash', 'insurance', 'bank_transfer');--> statement-breakpoint
CREATE TABLE "doctor_clinic_procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_clinic_id" uuid NOT NULL,
	"procedure_id" uuid NOT NULL,
	"price" numeric(10, 2),
	"duration_override" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "doctor_clinic_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_clinic_id" uuid NOT NULL,
	"weekly_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specific_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_appointment_duration" integer DEFAULT 30 NOT NULL,
	"minimum_advance_hours" integer DEFAULT 0 NOT NULL,
	"max_future_days" integer DEFAULT 365 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "doctor_clinic_schedules_doctor_clinic_id_unique" UNIQUE("doctor_clinic_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_duration" integer DEFAULT 30 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "doctor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"crm" varchar(50),
	"specialty" varchar(100),
	"bio" text,
	"photo_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "doctor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"type" "payment_method_type" NOT NULL,
	"name" varchar(100) NOT NULL,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"default_duration" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "doctor_clinic_procedures" ADD CONSTRAINT "doctor_clinic_procedures_doctor_clinic_id_doctor_clinics_id_fk" FOREIGN KEY ("doctor_clinic_id") REFERENCES "public"."doctor_clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinic_procedures" ADD CONSTRAINT "doctor_clinic_procedures_procedure_id_procedures_id_fk" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinic_schedules" ADD CONSTRAINT "doctor_clinic_schedules_doctor_clinic_id_doctor_clinics_id_fk" FOREIGN KEY ("doctor_clinic_id") REFERENCES "public"."doctor_clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinics" ADD CONSTRAINT "doctor_clinics_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_clinics" ADD CONSTRAINT "doctor_clinics_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_doctor_clinic_procedure" ON "doctor_clinic_procedures" USING btree ("doctor_clinic_id","procedure_id");--> statement-breakpoint
CREATE INDEX "idx_dcp_doctor_clinic" ON "doctor_clinic_procedures" USING btree ("doctor_clinic_id");--> statement-breakpoint
CREATE INDEX "idx_dcp_procedure" ON "doctor_clinic_procedures" USING btree ("procedure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_doctor_clinic" ON "doctor_clinics" USING btree ("doctor_id","clinic_id");--> statement-breakpoint
CREATE INDEX "idx_doctor_clinics_clinic" ON "doctor_clinics" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_doctor_clinics_doctor" ON "doctor_clinics" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_payment_methods_clinic" ON "payment_methods" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_procedures_clinic" ON "procedures" USING btree ("clinic_id");