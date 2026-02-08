-- Drop foreign key constraint from user_id
-- Audit logs should preserve historical data even for deleted or non-existent users
-- This prevents FK violations during async logging when users might be in transient states
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_user_id_users_id_fk";
