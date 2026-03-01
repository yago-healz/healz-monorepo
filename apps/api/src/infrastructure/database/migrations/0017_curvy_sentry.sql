ALTER TABLE "clinic_carol_settings" ADD COLUMN "name" varchar(100) DEFAULT 'Carol' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_carol_settings" ADD COLUMN "voice_tone" varchar(20) DEFAULT 'empathetic' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_carol_settings" ADD COLUMN "scheduling_rules" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_carol_settings" ADD COLUMN "status" varchar(20) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic_carol_settings" ADD COLUMN "published_at" timestamp;