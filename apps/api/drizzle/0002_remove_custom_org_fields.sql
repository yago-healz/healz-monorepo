-- Remove custom organization fields to align with Better Auth
-- Better Auth organization plugin only uses: id, name, slug, createdAt, updatedAt

-- Drop custom columns
ALTER TABLE "organization" DROP COLUMN IF EXISTS "logo";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN IF EXISTS "metadata";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN IF EXISTS "status";--> statement-breakpoint

-- Drop enum that is no longer needed
DROP TYPE IF EXISTS "org_status";
