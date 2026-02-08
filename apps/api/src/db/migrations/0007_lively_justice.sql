CREATE TABLE "patient_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"full_name" varchar(255),
	"email" varchar(255),
	"birth_date" date,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_view_phone_tenant_unique" ON "patient_view" USING btree ("phone","tenant_id");--> statement-breakpoint
CREATE INDEX "idx_patient_view_tenant" ON "patient_view" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_patient_view_clinic" ON "patient_view" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_patient_view_status" ON "patient_view" USING btree ("status");