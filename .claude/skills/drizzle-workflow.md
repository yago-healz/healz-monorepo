# Drizzle ORM - Migration Workflow

Skill for working with Drizzle ORM using the **generate + migrate** workflow (recommended for development and production).

## Main Commands

### 1. Modify Schema

```typescript
// apps/api/src/db/schema.ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  // ... add or modify columns
});
```

### 2. Generate Migration

```bash
cd apps/api
npx drizzle-kit generate
```

- Creates a `.sql` file in `drizzle/migrations/`
- **Always review the generated SQL before applying it!**

### 3. Apply Migration

```bash
npx drizzle-kit migrate
```

- Applies pending migrations
- Records in `__drizzle_migrations`

## Full Workflow

```bash
# 1. Modify the TypeScript schema
vim src/db/schema.ts

# 2. Generate the migration
npx drizzle-kit generate

# 3. Review the generated SQL
cat drizzle/migrations/0001_*.sql

# 4. Apply the migration
npx drizzle-kit migrate

# 5. Commit everything together
git add src/db/schema.ts drizzle/migrations/
git commit -m "Add user email column"
```

## Useful Commands

### View Current Schema

```bash
npx drizzle-kit studio
```

Opens the visual interface at `https://local.drizzle.studio`

### Pull from Existing Database

```bash
npx drizzle-kit pull
```

Generates a TypeScript schema from the existing database

### Check Differences

```bash
npx drizzle-kit check
```

Shows differences between the TypeScript schema and the database

## Common Problems

### ❌ "relation already exists"

**Cause:** The table exists in the database but is not recorded in `__drizzle_migrations`

**Solution 1 - Reset (development):**

```sql
-- Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

```bash
npx drizzle-kit migrate
```

**Solution 2 - Synchronize:**

```sql
-- Mark the migration as applied
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('0001_migration_name', NOW());
```

### ❌ Migration out of order

```bash
# Delete the problematic migration
rm drizzle/migrations/0005_*.sql

# Generate again
npx drizzle-kit generate
```

## Difference: push vs migrate

| Command   | Usage                   | Tracking                              |
| --------- | ----------------------- | ------------------------------------- |
| `push`    | Rapid prototypes        | ❌ Does not track                     |
| `migrate` | Development/Production  | ✅ Tracks in `__drizzle_migrations`   |

**Use `migrate` by default!** Only use `push` for disposable experimentation.

## drizzle.config.ts Configuration

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "__drizzle_migrations", // control table name
    schema: "public", // schema for PostgreSQL
  },
});
```

## Best Practices

1. **Always review** the generated SQL before applying
2. **Commit migrations with the** TypeScript schema
3. **Never edit** migrations already applied in production
4. **Use sequential migrations** - do not skip numbers
5. **Test locally** before applying in production
6. **Back up before large migrations** in production

## Production

```bash
# In CI/CD or deploy
cd apps/api
npx drizzle-kit migrate

# Or use migrate programmatically in code
import { migrate } from 'drizzle-orm/node-postgres/migrator';
await migrate(db, { migrationsFolder: './drizzle/migrations' });
```

## Useful Links

- Docs: https://orm.drizzle.team/docs/migrations
- Drizzle Studio: https://orm.drizzle.team/drizzle-studio/overview
- Migrate Command: https://orm.drizzle.team/docs/drizzle-kit-migrate
