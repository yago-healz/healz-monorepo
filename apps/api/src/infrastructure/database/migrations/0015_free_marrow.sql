ALTER TABLE "clinic_scheduling" ADD COLUMN "weekly_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_scheduling" ADD COLUMN "default_appointment_duration" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_scheduling" ADD COLUMN "minimum_advance_hours" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_scheduling" ADD COLUMN "max_future_days" integer DEFAULT 365 NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_scheduling" ADD COLUMN "specific_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;