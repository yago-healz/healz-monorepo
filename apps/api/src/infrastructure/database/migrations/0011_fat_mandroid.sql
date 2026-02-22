CREATE TABLE "patient_journey_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"current_stage" varchar(50) DEFAULT 'lead' NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"risk_level" varchar(20) DEFAULT 'low' NOT NULL,
	"milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stage_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_journey_patient" ON "patient_journey_view" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_journey_clinic" ON "patient_journey_view" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "idx_journey_stage" ON "patient_journey_view" USING btree ("current_stage");--> statement-breakpoint
CREATE INDEX "idx_journey_risk_level" ON "patient_journey_view" USING btree ("risk_level");--> statement-breakpoint
CREATE INDEX "idx_journey_risk_score" ON "patient_journey_view" USING btree ("risk_score");