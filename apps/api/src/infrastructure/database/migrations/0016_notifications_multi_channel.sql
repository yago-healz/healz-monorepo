-- Add new jsonb columns
ALTER TABLE "clinic_notifications" ADD COLUMN "alert_channels" jsonb NOT NULL DEFAULT '["whatsapp"]'::jsonb;--> statement-breakpoint
ALTER TABLE "clinic_notifications" ADD COLUMN "phone_numbers" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint

-- Migrate existing data
UPDATE "clinic_notifications"
  SET alert_channels = json_build_array(alert_channel)::jsonb,
      phone_numbers = CASE WHEN phone_number IS NOT NULL
                      THEN json_build_array(phone_number)::jsonb
                      ELSE '[]'::jsonb END;--> statement-breakpoint

-- Drop old columns
ALTER TABLE "clinic_notifications" DROP COLUMN "alert_channel";--> statement-breakpoint
ALTER TABLE "clinic_notifications" DROP COLUMN "phone_number";
