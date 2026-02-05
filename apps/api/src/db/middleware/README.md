# Row-Level Security (RLS) Middleware

## Overview

The RLS middleware implements Row-Level Security for multi-tenant data isolation in the Healz application. It automatically sets the current organization context in PostgreSQL session variables, enabling database-level security policies.

## How It Works

1. **Request Flow**:
   - User authenticates and gets a session
   - Session contains `activeOrganizationId`
   - RLS middleware extracts this ID and sets it in PostgreSQL
   - All subsequent database queries are automatically filtered

2. **Database Level**:
   ```sql
   -- Function to get current org ID
   SELECT current_org_id(); -- Returns the session's organization ID

   -- Policy automatically applied to queries
   SELECT * FROM clinic; -- Only returns clinics for current organization
   ```

3. **Tables Protected**:
   - `clinic` - Isolated by `organization_id`
   - `clinic_user` - Isolated through clinic's `organization_id`

## Security Benefits

- **Automatic**: No need to manually add WHERE clauses
- **Foolproof**: Can't accidentally query wrong organization's data
- **Database-level**: Protection even if application code has bugs
- **Performance**: PostgreSQL optimizes RLS policies

## Testing RLS

### Verify RLS is Enabled

```sql
-- Check if RLS is enabled on tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('clinic', 'clinic_user');
```

### Test Organization Isolation

```sql
-- Set org context
SELECT set_config('app.current_org_id', 'org-123', false);

-- Query will only return data for org-123
SELECT * FROM clinic;

-- Switch to different org
SELECT set_config('app.current_org_id', 'org-456', false);

-- Now will only return data for org-456
SELECT * FROM clinic;
```

### Disable RLS (for admin/superuser operations)

```sql
-- Disable RLS for current session (requires superuser)
SET row_security = OFF;

-- Or use BYPASSRLS role attribute
ALTER ROLE your_app_user BYPASSRLS;
```

## Important Notes

1. **Middleware Order**: RLS middleware runs after AuthGuard to ensure session is available
2. **Error Handling**: If RLS context fails to set, request continues but queries return empty
3. **Performance**: RLS policies are indexed, minimal performance impact
4. **Excluded Routes**: Auth endpoints (`/api/auth/*`) skip RLS middleware

## Future Enhancements

- Add RLS to more tables (appointments, patients, etc.)
- Implement audit logging for context switches
- Add monitoring for RLS policy violations
- Create admin bypass mechanism for support operations
