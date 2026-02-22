CREATE TABLE "conversation_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"channel" varchar(20) NOT NULL,
	"is_escalated" boolean DEFAULT false,
	"escalated_to_user_id" uuid,
	"escalated_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"message_count" integer DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"direction" varchar(10) NOT NULL,
	"from_phone" varchar(20),
	"to_phone" varchar(20),
	"content" text NOT NULL,
	"message_type" varchar(20) DEFAULT 'text',
	"media_url" text,
	"sent_by" varchar(20),
	"intent" varchar(50),
	"intent_confidence" numeric(3, 2),
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_conversation_view_patient" ON "conversation_view" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_view_tenant" ON "conversation_view" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_conversation_view_status" ON "conversation_view" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_conversation_view_escalated" ON "conversation_view" USING btree ("is_escalated");--> statement-breakpoint
CREATE INDEX "idx_message_view_conversation" ON "message_view" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_message_view_created_at" ON "message_view" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_message_view_intent" ON "message_view" USING btree ("intent");