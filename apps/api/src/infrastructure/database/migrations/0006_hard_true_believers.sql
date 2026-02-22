CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"aggregate_type" varchar(50) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"aggregate_version" integer NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clinic_id" uuid,
	"causation_id" uuid,
	"correlation_id" uuid NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_data" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "events_aggregate_version_unique" ON "events" USING btree ("aggregate_id","aggregate_version");--> statement-breakpoint
CREATE INDEX "idx_events_aggregate" ON "events" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "idx_events_correlation" ON "events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_events_causation" ON "events" USING btree ("causation_id");--> statement-breakpoint
CREATE INDEX "idx_events_tenant" ON "events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_events_type" ON "events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_events_created_at" ON "events" USING btree ("created_at");