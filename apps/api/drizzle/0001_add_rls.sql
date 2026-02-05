-- Enable Row Level Security on multi-tenant tables
ALTER TABLE "clinic" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinic_user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Function to get current organization ID from session context
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
  SELECT current_setting('app.current_org_id', true);
$$ LANGUAGE SQL STABLE;--> statement-breakpoint

-- Policy: Isolate clinics by organization
-- Users can only see clinics that belong to their current active organization
CREATE POLICY clinic_org_isolation ON "clinic"
  USING ("organization_id" = current_org_id());--> statement-breakpoint

-- Policy: Isolate clinic_user by organization (via clinic)
-- Users can only see clinic_user records for clinics in their current organization
CREATE POLICY clinic_user_org_isolation ON "clinic_user"
  USING (
    "clinic_id" IN (
      SELECT "id" FROM "clinic" WHERE "organization_id" = current_org_id()
    )
  );
